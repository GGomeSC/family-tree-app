from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.main import app
from app.models.family import Family, FamilyStatus
from app.models.person import Person
from app.models.user import User, UserRole

INERT_PASSWORD_HASH = "not-used-by-this-test"


def _build_session_factory(tmp_path, db_name: str) -> sessionmaker[Session]:
    engine = create_engine(f"sqlite:///{tmp_path / db_name}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def _seed_user(db: Session, *, name: str, email: str, role: UserRole) -> User:
    user = User(
        name=name,
        email=email,
        password_hash=INERT_PASSWORD_HASH,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def _seed_family(db: Session, *, owner: User, title: str, client_reference: str) -> Family:
    family = Family(
        title=title,
        client_reference=client_reference,
        status=FamilyStatus.DRAFT,
        created_by=owner.id,
    )
    db.add(family)
    db.flush()
    return family


def _seed_person(db: Session, *, family: Family, name: str, richiedente: bool) -> Person:
    person = Person(
        family_id=family.id,
        full_name=name,
        birth_date=datetime(1980, 1, 1, tzinfo=UTC).date(),
        is_richiedente=richiedente,
        notes=None,
    )
    db.add(person)
    db.flush()
    return person


@pytest.fixture
def family_access_fixture(tmp_path):
    session_factory = _build_session_factory(tmp_path, "family-access.sqlite")

    db = session_factory()
    try:
        admin = _seed_user(db, name="Admin", email="admin@example.com", role=UserRole.ADMIN)
        owner = _seed_user(db, name="Owner", email="owner@example.com", role=UserRole.STAFF)
        outsider = _seed_user(db, name="Outsider", email="outsider@example.com", role=UserRole.STAFF)

        family = _seed_family(db, owner=owner, title="Owner Family", client_reference="OWN-1")
        parent = _seed_person(db, family=family, name="Parent Person", richiedente=False)
        child = _seed_person(db, family=family, name="Child Person", richiedente=True)

        db.commit()
        for record in (admin, owner, outsider, family, parent, child):
            db.refresh(record)
        yield {
            "session_factory": session_factory,
            "admin": admin,
            "owner": owner,
            "outsider": outsider,
            "family": family,
            "parent": parent,
            "child": child,
        }
    finally:
        db.close()
        app.dependency_overrides.clear()


def _client_for_user(session_factory: sessionmaker[Session], user: User) -> TestClient:
    def _get_test_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def test_staff_can_access_their_own_family_preview(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["owner"])
    try:
        response = client.get(f"/api/v1/families/{family_access_fixture['family'].id}/preview")
        assert response.status_code == 200
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_staff_can_list_people_for_their_own_family(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["owner"])
    try:
        response = client.get(f"/api/v1/families/{family_access_fixture['family'].id}/persons")
        assert response.status_code == 200
        assert [person["full_name"] for person in response.json()] == ["Parent Person", "Child Person"]
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_staff_gets_404_for_other_users_family_read(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["outsider"])
    try:
        response = client.get(f"/api/v1/families/{family_access_fixture['family'].id}/preview")
        assert response.status_code == 404
        assert response.json()["detail"] == "Family not found"
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_staff_gets_404_for_other_users_family_people_list(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["outsider"])
    try:
        response = client.get(f"/api/v1/families/{family_access_fixture['family'].id}/persons")
        assert response.status_code == 404
        assert response.json()["detail"] == "Family not found"
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_staff_gets_404_for_other_users_family_write(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["outsider"])
    try:
        response = client.post(
            f"/api/v1/families/{family_access_fixture['family'].id}/persons",
            json={
                "full_name": "Blocked Person",
                "birth_date": "1990-01-01",
                "is_richiedente": False,
                "notes": None,
            },
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Family not found"
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_admin_can_access_another_users_family(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["admin"])
    try:
        response = client.get(f"/api/v1/families/{family_access_fixture['family'].id}")
        assert response.status_code == 200
        assert response.json()["id"] == family_access_fixture["family"].id
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_admin_can_list_people_for_another_users_family(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["admin"])
    try:
        response = client.get(f"/api/v1/families/{family_access_fixture['family'].id}/persons")
        assert response.status_code == 200
        assert [person["full_name"] for person in response.json()] == ["Parent Person", "Child Person"]
    finally:
        client.close()
        app.dependency_overrides.clear()


def test_parent_child_link_creation_still_works_with_locked_family_lookup(family_access_fixture):
    client = _client_for_user(family_access_fixture["session_factory"], family_access_fixture["owner"])
    try:
        response = client.post(
            f"/api/v1/families/{family_access_fixture['family'].id}/parent-child-links",
            json={
                "parent_person_id": family_access_fixture["parent"].id,
                "child_person_id": family_access_fixture["child"].id,
            },
        )
        assert response.status_code == 201
        assert response.json() == {"message": "Parent-child link created"}
    finally:
        client.close()
        app.dependency_overrides.clear()
