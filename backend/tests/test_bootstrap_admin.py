from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.cli.bootstrap_admin import bootstrap_admin
from app.core.config import settings
from app.core.database import Base
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole


def _session_factory(tmp_path: Path) -> tuple[sessionmaker[Session], Engine]:
    db_path = tmp_path / "bootstrap-admin.sqlite"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine), engine


def test_bootstrap_admin_creates_admin_user_when_missing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    session_factory, engine = _session_factory(tmp_path)
    monkeypatch.setattr(settings, "bootstrap_admin_email", "new-admin@example.com")
    monkeypatch.setattr(settings, "bootstrap_admin_password", "StrongPass123!")
    monkeypatch.setattr(settings, "bootstrap_admin_name", "New Local Admin")

    result = bootstrap_admin(reset_password=False, session_factory=session_factory, db_engine=engine)

    assert result.action == "created"
    assert result.email == "new-admin@example.com"
    assert result.password_reset is True

    db = session_factory()
    try:
        user = db.query(User).filter(User.email == "new-admin@example.com").first()
        assert user is not None
        assert user.name == "New Local Admin"
        assert user.role == UserRole.ADMIN
        assert user.is_active is True
        assert verify_password("StrongPass123!", user.password_hash)
    finally:
        db.close()


def test_bootstrap_admin_promotes_existing_user_without_password_reset(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    session_factory, engine = _session_factory(tmp_path)
    original_hash = get_password_hash("original-password")

    db = session_factory()
    try:
        db.add(
            User(
                name="Staff User",
                email="staff@example.com",
                password_hash=original_hash,
                role=UserRole.STAFF,
                is_active=False,
            )
        )
        db.commit()
    finally:
        db.close()

    monkeypatch.setattr(settings, "bootstrap_admin_email", "staff@example.com")
    monkeypatch.setattr(settings, "bootstrap_admin_password", "new-password-ignored")
    monkeypatch.setattr(settings, "bootstrap_admin_name", "Ignored Name")

    result = bootstrap_admin(reset_password=False, session_factory=session_factory, db_engine=engine)

    assert result.action == "updated"
    assert result.password_reset is False

    db = session_factory()
    try:
        user = db.query(User).filter(User.email == "staff@example.com").first()
        assert user is not None
        assert user.role == UserRole.ADMIN
        assert user.is_active is True
        assert user.password_hash == original_hash
    finally:
        db.close()


def test_bootstrap_admin_resets_password_when_requested(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    session_factory, engine = _session_factory(tmp_path)
    original_hash = get_password_hash("old-password")

    db = session_factory()
    try:
        db.add(
            User(
                name="Existing Admin",
                email="existing-admin@example.com",
                password_hash=original_hash,
                role=UserRole.ADMIN,
                is_active=True,
            )
        )
        db.commit()
    finally:
        db.close()

    monkeypatch.setattr(settings, "bootstrap_admin_email", "existing-admin@example.com")
    monkeypatch.setattr(settings, "bootstrap_admin_password", "new-password")
    monkeypatch.setattr(settings, "bootstrap_admin_name", "Existing Admin")

    result = bootstrap_admin(reset_password=True, session_factory=session_factory, db_engine=engine)

    assert result.action == "updated"
    assert result.password_reset is True

    db = session_factory()
    try:
        user = db.query(User).filter(User.email == "existing-admin@example.com").first()
        assert user is not None
        assert user.password_hash != original_hash
        assert verify_password("new-password", user.password_hash)
    finally:
        db.close()


@pytest.mark.parametrize(
    ("email", "password", "expected_error"),
    [
        ("", "some-password", "Missing required environment variable: BOOTSTRAP_ADMIN_EMAIL"),
        ("admin@example.com", "", "Missing required environment variable: BOOTSTRAP_ADMIN_PASSWORD"),
    ],
)
def test_bootstrap_admin_fails_when_required_env_vars_are_missing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    email: str,
    password: str,
    expected_error: str,
):
    session_factory, engine = _session_factory(tmp_path)

    monkeypatch.setattr(settings, "bootstrap_admin_email", email)
    monkeypatch.setattr(settings, "bootstrap_admin_password", password)

    with pytest.raises(ValueError, match=expected_error):
        bootstrap_admin(reset_password=False, session_factory=session_factory, db_engine=engine)
