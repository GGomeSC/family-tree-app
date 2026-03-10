from __future__ import annotations

from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterator

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token, get_password_hash
from app.main import app
import app.main as app_main
from app.models.export import Export
from app.models.family import Family, FamilyStatus
from app.models.person import ParentChildLink, Person, Union
from app.models.user import User, UserRole


def reset_rate_limiter_state() -> None:
    storage = getattr(limiter, "_storage", None)
    if storage is None:
        return
    if hasattr(storage, "reset"):
        storage.reset()
        return
    if hasattr(storage, "clear"):
        storage.clear()


@dataclass
class IntegrationEnv:
    client: TestClient
    session_factory: sessionmaker

    @contextmanager
    def db_session(self) -> Iterator[Session]:
        db = self.session_factory()
        try:
            yield db
        finally:
            db.close()

    def create_user(
        self,
        *,
        name: str,
        email: str,
        password: str = "password123",
        role: UserRole = UserRole.STAFF,
        is_active: bool = True,
    ) -> User:
        with self.db_session() as db:
            user = User(
                name=name,
                email=email,
                password_hash=get_password_hash(password),
                role=role,
                is_active=is_active,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def create_family(
        self,
        *,
        owner: User,
        title: str,
        client_reference: str | None = None,
        status: FamilyStatus = FamilyStatus.DRAFT,
        archived_at: datetime | None = None,
    ) -> Family:
        with self.db_session() as db:
            family = Family(
                title=title,
                client_reference=client_reference,
                status=status,
                created_by=owner.id,
                archived_at=archived_at,
            )
            db.add(family)
            db.commit()
            db.refresh(family)
            return family

    def create_person(
        self,
        *,
        family: Family,
        full_name: str,
        birth_date: date | None = None,
        is_richiedente: bool = False,
        notes: str | None = None,
    ) -> Person:
        with self.db_session() as db:
            person = Person(
                family_id=family.id,
                full_name=full_name,
                birth_date=birth_date or date(1980, 1, 1),
                is_richiedente=is_richiedente,
                notes=notes,
            )
            db.add(person)
            db.commit()
            db.refresh(person)
            return person

    def create_union(
        self,
        *,
        family: Family,
        partner_a: Person,
        partner_b: Person,
        marriage_date: date | None = None,
    ) -> Union:
        with self.db_session() as db:
            union = Union(
                family_id=family.id,
                partner_a_person_id=partner_a.id,
                partner_b_person_id=partner_b.id,
                marriage_date=marriage_date,
            )
            db.add(union)
            db.commit()
            db.refresh(union)
            return union

    def create_parent_child_link(self, *, family: Family, parent: Person, child: Person) -> ParentChildLink:
        with self.db_session() as db:
            link = ParentChildLink(
                family_id=family.id,
                parent_person_id=parent.id,
                child_person_id=child.id,
            )
            db.add(link)
            db.commit()
            db.refresh(link)
            return link

    def create_export(
        self,
        *,
        family: Family,
        user: User,
        file_path: str = "family_export.pdf",
        format: str = "pdf",
        template_version: str = "v1",
    ) -> Export:
        with self.db_session() as db:
            export = Export(
                family_id=family.id,
                exported_by=user.id,
                format=format,
                template_version=template_version,
                file_path=file_path,
            )
            db.add(export)
            db.commit()
            db.refresh(export)
            return export

    def login(self, *, email: str, password: str):
        return self.client.post("/api/v1/auth/login", json={"email": email, "password": password})

    def login_as(self, user: User, *, password: str = "password123"):
        return self.login(email=user.email, password=password)

    def auth_headers_for(self, user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {create_access_token(user.id)}"}

    def fetch_family(self, family_id: int) -> Family:
        with self.db_session() as db:
            return db.query(Family).filter(Family.id == family_id).one()

    def fetch_person(self, person_id: int) -> Person | None:
        with self.db_session() as db:
            return db.query(Person).filter(Person.id == person_id).first()

    def fetch_union(self, union_id: int) -> Union | None:
        with self.db_session() as db:
            return db.query(Union).filter(Union.id == union_id).first()

    def fetch_link(self, link_id: int) -> ParentChildLink | None:
        with self.db_session() as db:
            return db.query(ParentChildLink).filter(ParentChildLink.id == link_id).first()


@pytest.fixture
def _lifespan_engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'lifespan.sqlite'}", connect_args={"check_same_thread": False})
    export_dir = tmp_path / "exports-lifespan"
    export_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(app_main, "engine", engine)
    monkeypatch.setattr(settings, "export_dir", str(export_dir))
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(autouse=True)
def isolate_app_lifespan_engine(_lifespan_engine, monkeypatch: pytest.MonkeyPatch):
    @asynccontextmanager
    async def _noop_lifespan(_: object):
        yield

    monkeypatch.setattr(app.router, "lifespan_context", _noop_lifespan)
    yield


@pytest.fixture
def integration_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[IntegrationEnv]:
    db_path = tmp_path / "integration.sqlite"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    export_dir = tmp_path / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(settings, "export_dir", str(export_dir))
    monkeypatch.setattr(settings, "auth_cookie_secure", True)
    monkeypatch.setattr(settings, "auth_cookie_samesite", "strict")
    monkeypatch.setattr(settings, "auth_cookie_name", "access_token")
    monkeypatch.setattr(settings, "access_token_expire_minutes", 60)
    monkeypatch.setattr(settings, "login_rate_limit_attempts", 5)
    monkeypatch.setattr(settings, "login_rate_limit_window_minutes", 15)
    monkeypatch.setattr(app_main, "engine", engine)

    def _get_test_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_test_db
    reset_rate_limiter_state()
    try:
        with TestClient(app, base_url="https://testserver") as client:
            yield IntegrationEnv(client=client, session_factory=session_factory)
    finally:
        reset_rate_limiter_state()
        app.dependency_overrides.clear()
        engine.dispose()


@pytest.fixture
def admin_user(integration_env: IntegrationEnv) -> User:
    return integration_env.create_user(
        name="Admin",
        email="admin@example.com",
        role=UserRole.ADMIN,
    )


@pytest.fixture
def staff_user(integration_env: IntegrationEnv) -> User:
    return integration_env.create_user(
        name="Staff",
        email="staff@example.com",
        role=UserRole.STAFF,
    )


@pytest.fixture
def outsider_user(integration_env: IntegrationEnv) -> User:
    return integration_env.create_user(
        name="Outsider",
        email="outsider@example.com",
        role=UserRole.STAFF,
    )


@pytest.fixture
def sample_family(integration_env: IntegrationEnv, staff_user: User) -> Family:
    return integration_env.create_family(
        owner=staff_user,
        title="Rossi Family",
        client_reference="CLI-001",
    )


@pytest.fixture
def sample_people(integration_env: IntegrationEnv, sample_family: Family) -> tuple[Person, Person, Person]:
    parent = integration_env.create_person(family=sample_family, full_name="Mario Rossi")
    partner = integration_env.create_person(family=sample_family, full_name="Giulia Bianchi")
    child = integration_env.create_person(
        family=sample_family,
        full_name="Luigi Rossi",
        birth_date=date(2005, 1, 1),
        is_richiedente=True,
    )
    return parent, partner, child
