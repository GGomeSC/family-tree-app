from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.main import app
from app.models.export import Export
from app.models.family import Family, FamilyStatus
from app.models.user import User, UserRole
from app.services.export import resolve_export_file_path


@pytest.fixture
def export_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr("app.services.export.settings.export_dir", str(tmp_path))
    return tmp_path


def test_resolve_export_file_path_accepts_valid_file(export_root: Path):
    file_path = export_root / "family_1_test.pdf"
    file_path.write_bytes(b"pdf-bytes")

    resolved = resolve_export_file_path("family_1_test.pdf")

    assert resolved == file_path.resolve()


@pytest.mark.parametrize("malicious_path", ["../../../etc/passwd", "/etc/passwd"])
def test_resolve_export_file_path_rejects_outside_safe_directory(malicious_path: str, export_root: Path):
    with pytest.raises(HTTPException) as exc:
        resolve_export_file_path(malicious_path)

    assert exc.value.status_code == 403


def test_resolve_export_file_path_returns_404_for_missing_file(export_root: Path):
    with pytest.raises(HTTPException) as exc:
        resolve_export_file_path("missing.pdf")

    assert exc.value.status_code == 404


def _session_factory(tmp_path: Path) -> tuple[sessionmaker[Session], User]:
    db_path = tmp_path / "export-security.sqlite"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)

    db = session_factory()
    try:
        admin = User(
            name="Admin",
            email="admin@example.com",
            password_hash="hashed",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.flush()

        family = Family(
            title="Familia Teste",
            client_reference="T-1",
            status=FamilyStatus.DRAFT,
            created_by=admin.id,
        )
        db.add(family)
        db.flush()

        now = datetime.now(UTC)
        db.add_all(
            [
                Export(
                    family_id=family.id,
                    exported_by=admin.id,
                    format="pdf",
                    template_version="v1",
                    file_path="../../../etc/passwd",
                    created_at=now,
                ),
                Export(
                    family_id=family.id,
                    exported_by=admin.id,
                    format="pdf",
                    template_version="v1",
                    file_path="safe-export.pdf",
                    created_at=now,
                ),
            ]
        )
        db.commit()
        db.refresh(admin)
        return session_factory, admin
    finally:
        db.close()


def test_download_export_blocks_tampered_file_path_and_serves_valid_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    session_factory, current_user = _session_factory(tmp_path)
    export_dir = tmp_path / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    (export_dir / "safe-export.pdf").write_bytes(b"%PDF-1.4 test")
    monkeypatch.setattr("app.services.export.settings.export_dir", str(export_dir))

    def _get_test_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[get_current_user] = lambda: current_user

    try:
        client = TestClient(app)

        blocked = client.get("/api/v1/exports/1/download")
        assert blocked.status_code == 403

        ok = client.get("/api/v1/exports/2/download")
        assert ok.status_code == 200
        assert ok.headers["content-type"].startswith("application/pdf")
    finally:
        app.dependency_overrides.clear()
