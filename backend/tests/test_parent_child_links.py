from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
import os
from pathlib import Path
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.main import app
from app.models.family import Family, FamilyStatus
from app.models.person import ParentChildLink, Person
from app.models.user import User, UserRole
from app.services.graph import detect_cycle

INERT_PASSWORD_HASH = "not-used-by-this-test"


def _build_session_factory(database_url: str, *, sqlite: bool) -> sessionmaker[Session]:
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if sqlite else {},
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def _seed_admin_user(db: Session, *, suffix: str) -> User:
    admin = User(
        name="Admin",
        email=f"admin-{suffix}@example.com",
        password_hash=INERT_PASSWORD_HASH,
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.flush()
    return admin


def _seed_family(db: Session, admin: User, *, suffix: str) -> tuple[Family, list[Person]]:
    family = Family(
        title=f"Familia {suffix}",
        client_reference=f"T-{suffix}",
        status=FamilyStatus.DRAFT,
        created_by=admin.id,
    )
    db.add(family)
    db.flush()

    people = [
        Person(
            family_id=family.id,
            full_name="Mario Rossi",
            birth_date=datetime(1950, 1, 1, tzinfo=UTC).date(),
            is_richiedente=False,
            notes=None,
        ),
        Person(
            family_id=family.id,
            full_name="Giulia Rossi",
            birth_date=datetime(1975, 1, 1, tzinfo=UTC).date(),
            is_richiedente=False,
            notes=None,
        ),
        Person(
            family_id=family.id,
            full_name="Luigi Rossi",
            birth_date=datetime(2000, 1, 1, tzinfo=UTC).date(),
            is_richiedente=True,
            notes=None,
        ),
    ]
    db.add_all(people)
    db.flush()
    return family, people


def _sqlite_session_factory(tmp_path: Path, db_name: str) -> tuple[sessionmaker[Session], User, Family, list[Person]]:
    session_factory = _build_session_factory(f"sqlite:///{tmp_path / db_name}", sqlite=True)
    suffix = uuid.uuid4().hex
    db = session_factory()
    try:
        admin = _seed_admin_user(db, suffix=suffix)
        family, people = _seed_family(db, admin, suffix=suffix)
        db.commit()
        db.refresh(admin)
        db.refresh(family)
        for person in people:
            db.refresh(person)
        return session_factory, admin, family, people
    finally:
        db.close()


def _override_app(session_factory: sessionmaker[Session], current_user: User) -> None:
    def _get_test_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[get_current_user] = lambda: current_user


@pytest.fixture
def sqlite_client(tmp_path: Path):
    session_factory, current_user, family, people = _sqlite_session_factory(tmp_path, "parent-child-links.sqlite")
    _override_app(session_factory, current_user)
    try:
        with TestClient(app) as client:
            yield client, session_factory, family, people
    finally:
        app.dependency_overrides.clear()


def test_create_parent_child_link_success(sqlite_client):
    client, session_factory, family, people = sqlite_client

    response = client.post(
        f"/api/v1/families/{family.id}/parent-child-links",
        json={"parent_person_id": people[0].id, "child_person_id": people[1].id},
    )

    assert response.status_code == 201
    assert response.json() == {"message": "Parent-child link created"}

    db = session_factory()
    try:
        links = db.query(ParentChildLink).filter(ParentChildLink.family_id == family.id).all()
        assert [(link.parent_person_id, link.child_person_id) for link in links] == [(people[0].id, people[1].id)]
    finally:
        db.close()


def test_create_parent_child_link_duplicate_conflict(sqlite_client):
    client, _, family, people = sqlite_client
    payload = {"parent_person_id": people[0].id, "child_person_id": people[1].id}

    first = client.post(f"/api/v1/families/{family.id}/parent-child-links", json=payload)
    second = client.post(f"/api/v1/families/{family.id}/parent-child-links", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "Parent-child link already exists"


def test_create_parent_child_link_rejects_self_cycle(sqlite_client):
    client, _, family, people = sqlite_client

    response = client.post(
        f"/api/v1/families/{family.id}/parent-child-links",
        json={"parent_person_id": people[0].id, "child_person_id": people[0].id},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "This relationship would create a cycle in lineage"


def test_create_parent_child_link_rejects_ancestry_cycle(sqlite_client):
    client, _, family, people = sqlite_client

    assert client.post(
        f"/api/v1/families/{family.id}/parent-child-links",
        json={"parent_person_id": people[0].id, "child_person_id": people[1].id},
    ).status_code == 201
    assert client.post(
        f"/api/v1/families/{family.id}/parent-child-links",
        json={"parent_person_id": people[1].id, "child_person_id": people[2].id},
    ).status_code == 201

    response = client.post(
        f"/api/v1/families/{family.id}/parent-child-links",
        json={"parent_person_id": people[2].id, "child_person_id": people[0].id},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "This relationship would create a cycle in lineage"


def _postgres_test_url() -> str | None:
    database_url = os.getenv("TEST_POSTGRES_URL") or os.getenv("DATABASE_URL")
    if not database_url or not database_url.startswith("postgresql"):
        return None
    return database_url


@pytest.mark.skipif(_postgres_test_url() is None, reason="PostgreSQL test database is required for row-lock stress test")
def test_concurrent_cycle_attempts_postgres():
    database_url = _postgres_test_url()
    assert database_url is not None

    session_factory = _build_session_factory(database_url, sqlite=False)
    suffix = uuid.uuid4().hex

    db = session_factory()
    try:
        admin = _seed_admin_user(db, suffix=suffix)
        family, people = _seed_family(db, admin, suffix=suffix)
        db.commit()
        db.refresh(admin)
        db.refresh(family)
        for person in people:
            db.refresh(person)
    finally:
        db.close()

    _override_app(session_factory, admin)
    try:
        def _attempt(index: int) -> int:
            payload = (
                {"parent_person_id": people[0].id, "child_person_id": people[1].id}
                if index % 2 == 0
                else {"parent_person_id": people[1].id, "child_person_id": people[0].id}
            )
            with TestClient(app) as client:
                response = client.post(f"/api/v1/families/{family.id}/parent-child-links", json=payload)
                return response.status_code

        with ThreadPoolExecutor(max_workers=10) as executor:
            status_codes = list(executor.map(_attempt, range(10)))

        assert status_codes.count(201) == 1
        assert set(status_codes).issubset({201, 400, 409})

        db = session_factory()
        try:
            links = db.query(ParentChildLink).filter(ParentChildLink.family_id == family.id).all()
            edges = [(link.parent_person_id, link.child_person_id) for link in links]
            nodes = {person.id for person in db.query(Person).filter(Person.family_id == family.id).all()}
            assert len(edges) == 1
            assert detect_cycle(nodes, edges) is False
        finally:
            db.close()
    finally:
        app.dependency_overrides.clear()
