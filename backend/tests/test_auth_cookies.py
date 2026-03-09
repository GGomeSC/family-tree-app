from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models.user import User, UserRole


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "auth-cookies.sqlite"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)

    monkeypatch.setattr(settings, "auth_cookie_secure", True)
    monkeypatch.setattr(settings, "auth_cookie_samesite", "strict")
    monkeypatch.setattr(settings, "auth_cookie_name", "access_token")
    monkeypatch.setattr(settings, "access_token_expire_minutes", 60)

    db: Session = session_factory()
    try:
        db.add(
            User(
                name="Admin",
                email="admin@example.com",
                password_hash=get_password_hash("password123"),
                role=UserRole.ADMIN,
                is_active=True,
            )
        )
        db.commit()
    finally:
        db.close()

    def _get_test_db():
        test_db = session_factory()
        try:
            yield test_db
        finally:
            test_db.close()

    app.dependency_overrides[get_db] = _get_test_db
    try:
        with TestClient(app, base_url="https://testserver") as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def test_login_sets_httponly_secure_cookie_and_hides_token_from_body(client: TestClient):
    response = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})

    assert response.status_code == 200
    assert response.json() == {"message": "Login successful"}
    set_cookie = response.headers["set-cookie"].lower()
    assert "access_token=" in set_cookie
    assert "httponly" in set_cookie
    assert "secure" in set_cookie
    assert "samesite=strict" in set_cookie
    assert "max-age=3600" in set_cookie
    assert "access_token" not in response.json()


def test_me_accepts_cookie_auth_and_logout_clears_cookie(client: TestClient):
    login = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert login.cookies.get("access_token")

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "admin@example.com"

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    set_cookie = logout.headers["set-cookie"].lower()
    assert "access_token=\"\"" in set_cookie
    assert "max-age=0" in set_cookie


def test_refresh_renews_cookie_when_authenticated(client: TestClient):
    login = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert login.cookies.get("access_token")

    refresh = client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 200
    assert refresh.json() == {"message": "Token refreshed"}
    set_cookie = refresh.headers["set-cookie"].lower()
    assert "access_token=" in set_cookie
    assert "httponly" in set_cookie
