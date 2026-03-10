from __future__ import annotations

def test_admin_can_create_user(integration_env, admin_user):
    response = integration_env.client.post(
        "/api/v1/users",
        headers=integration_env.auth_headers_for(admin_user),
        json={
            "name": "Case Worker",
            "email": "caseworker@example.com",
            "password": "StrongPass123!",
            "role": "staff",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["email"] == "caseworker@example.com"
    assert payload["role"] == "staff"
    assert "password" not in payload


def test_create_user_rejects_duplicate_email(integration_env, admin_user):
    integration_env.create_user(name="Existing", email="existing@example.com")

    response = integration_env.client.post(
        "/api/v1/users",
        headers=integration_env.auth_headers_for(admin_user),
        json={
            "name": "Duplicate",
            "email": "existing@example.com",
            "password": "StrongPass123!",
            "role": "staff",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email already exists"


def test_non_admin_cannot_create_user(integration_env, staff_user):
    response = integration_env.client.post(
        "/api/v1/users",
        headers=integration_env.auth_headers_for(staff_user),
        json={
            "name": "Blocked",
            "email": "blocked@example.com",
            "password": "StrongPass123!",
            "role": "staff",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin role required"
