from __future__ import annotations

def test_me_requires_authentication(integration_env):
    response = integration_env.client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_refresh_requires_authentication(integration_env):
    response = integration_env.client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_login_rejects_invalid_password(integration_env):
    user = integration_env.create_user(name="Alice", email="alice@example.com")

    response = integration_env.login_as(user, password="wrong-password")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_rejects_inactive_user(integration_env):
    user = integration_env.create_user(
        name="Inactive User",
        email="inactive@example.com",
        is_active=False,
    )

    response = integration_env.login_as(user)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_me_accepts_bearer_token(integration_env):
    user = integration_env.create_user(name="Bearer User", email="bearer@example.com")

    response = integration_env.client.get("/api/v1/auth/me", headers=integration_env.auth_headers_for(user))

    assert response.status_code == 200
    assert response.json()["email"] == "bearer@example.com"


def test_invalid_bearer_header_overrides_valid_cookie_session(integration_env):
    user = integration_env.create_user(name="Cookie User", email="cookie@example.com")
    login = integration_env.login_as(user)
    assert login.status_code == 200

    response = integration_env.client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
