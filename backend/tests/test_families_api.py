from __future__ import annotations

from app.models.family import FamilyStatus


def test_staff_list_is_scoped_and_supports_status_filter(
    integration_env,
    staff_user,
    outsider_user,
):
    owned_draft = integration_env.create_family(owner=staff_user, title="Owned Draft", status=FamilyStatus.DRAFT)
    owned_reviewed = integration_env.create_family(
        owner=staff_user,
        title="Owned Reviewed",
        status=FamilyStatus.REVIEWED,
    )
    integration_env.create_family(owner=outsider_user, title="Outsider Family", status=FamilyStatus.REVIEWED)

    response = integration_env.client.get(
        "/api/v1/families",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {owned_draft.id, owned_reviewed.id}

    filtered = integration_env.client.get(
        "/api/v1/families",
        headers=integration_env.auth_headers_for(staff_user),
        params={"status": FamilyStatus.REVIEWED.value},
    )

    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()] == [owned_reviewed.id]


def test_admin_list_sees_all_families(integration_env, admin_user, staff_user, outsider_user):
    first = integration_env.create_family(owner=staff_user, title="First Family")
    second = integration_env.create_family(owner=outsider_user, title="Second Family")

    response = integration_env.client.get(
        "/api/v1/families",
        headers=integration_env.auth_headers_for(admin_user),
    )

    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {first.id, second.id}


def test_create_get_and_update_family(integration_env, staff_user):
    create = integration_env.client.post(
        "/api/v1/families",
        headers=integration_env.auth_headers_for(staff_user),
        json={"title": "New Family", "client_reference": "REF-123"},
    )

    assert create.status_code == 201
    family_id = create.json()["id"]

    get_response = integration_env.client.get(
        f"/api/v1/families/{family_id}",
        headers=integration_env.auth_headers_for(staff_user),
    )
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "New Family"

    patch = integration_env.client.patch(
        f"/api/v1/families/{family_id}",
        headers=integration_env.auth_headers_for(staff_user),
        json={"title": "Updated Family", "client_reference": "REF-456"},
    )

    assert patch.status_code == 200
    assert patch.json()["title"] == "Updated Family"
    assert patch.json()["client_reference"] == "REF-456"


def test_family_status_update_allows_valid_transition_and_same_state_noop(
    integration_env,
    staff_user,
):
    family = integration_env.create_family(owner=staff_user, title="Workflow Family")

    same_state = integration_env.client.patch(
        f"/api/v1/families/{family.id}/status",
        headers=integration_env.auth_headers_for(staff_user),
        json={"status": FamilyStatus.DRAFT.value},
    )
    assert same_state.status_code == 200
    assert same_state.json()["status"] == FamilyStatus.DRAFT.value

    reviewed = integration_env.client.patch(
        f"/api/v1/families/{family.id}/status",
        headers=integration_env.auth_headers_for(staff_user),
        json={"status": FamilyStatus.REVIEWED.value},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == FamilyStatus.REVIEWED.value

    exported = integration_env.client.patch(
        f"/api/v1/families/{family.id}/status",
        headers=integration_env.auth_headers_for(staff_user),
        json={"status": FamilyStatus.EXPORTED.value},
    )
    assert exported.status_code == 200
    assert exported.json()["status"] == FamilyStatus.EXPORTED.value


def test_family_status_update_rejects_invalid_transition(integration_env, staff_user):
    family = integration_env.create_family(owner=staff_user, title="Invalid Workflow Family")

    response = integration_env.client.patch(
        f"/api/v1/families/{family.id}/status",
        headers=integration_env.auth_headers_for(staff_user),
        json={"status": FamilyStatus.EXPORTED.value},
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]


def test_delete_family_archives_and_sets_timestamp(integration_env, staff_user):
    family = integration_env.create_family(owner=staff_user, title="Archive Me")

    response = integration_env.client.delete(
        f"/api/v1/families/{family.id}",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Family archived"}

    stored = integration_env.fetch_family(family.id)
    assert stored.status == FamilyStatus.ARCHIVED
    assert stored.archived_at is not None
