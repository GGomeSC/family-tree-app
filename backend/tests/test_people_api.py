from __future__ import annotations

def test_create_update_and_delete_person(integration_env, staff_user, sample_family):
    create = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/persons",
        headers=integration_env.auth_headers_for(staff_user),
        json={
            "full_name": "New Person",
            "birth_date": "1992-04-01",
            "is_richiedente": False,
            "notes": "Initial notes",
        },
    )

    assert create.status_code == 201
    person_id = create.json()["id"]

    update = integration_env.client.patch(
        f"/api/v1/families/{sample_family.id}/persons/{person_id}",
        headers=integration_env.auth_headers_for(staff_user),
        json={"full_name": "Updated Person", "notes": "Updated notes", "is_richiedente": True},
    )

    assert update.status_code == 200
    assert update.json()["full_name"] == "Updated Person"
    assert update.json()["is_richiedente"] is True

    delete = integration_env.client.delete(
        f"/api/v1/families/{sample_family.id}/persons/{person_id}",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert delete.status_code == 200
    assert delete.json() == {"message": "Person deleted"}
    assert integration_env.fetch_person(person_id) is None


def test_create_union_update_and_delete(integration_env, staff_user, sample_family, sample_people):
    parent, partner, child = sample_people

    create = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/unions",
        headers=integration_env.auth_headers_for(staff_user),
        json={
            "partner_a_person_id": parent.id,
            "partner_b_person_id": partner.id,
            "marriage_date": "2000-06-15",
        },
    )

    assert create.status_code == 201
    union_id = create.json()["id"]

    update = integration_env.client.patch(
        f"/api/v1/families/{sample_family.id}/unions/{union_id}",
        headers=integration_env.auth_headers_for(staff_user),
        json={"partner_b_person_id": child.id},
    )

    assert update.status_code == 200
    assert update.json()["partner_b_person_id"] == child.id

    delete = integration_env.client.delete(
        f"/api/v1/families/{sample_family.id}/unions/{union_id}",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert delete.status_code == 200
    assert delete.json() == {"message": "Union deleted"}
    assert integration_env.fetch_union(union_id) is None


def test_create_union_rejects_same_partner(integration_env, staff_user, sample_family, sample_people):
    parent, _, _ = sample_people

    response = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/unions",
        headers=integration_env.auth_headers_for(staff_user),
        json={"partner_a_person_id": parent.id, "partner_b_person_id": parent.id},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Partners must be different people"


def test_create_union_rejects_duplicate_pair_even_when_reversed(
    integration_env,
    staff_user,
    sample_family,
    sample_people,
):
    parent, partner, _ = sample_people
    first = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/unions",
        headers=integration_env.auth_headers_for(staff_user),
        json={"partner_a_person_id": parent.id, "partner_b_person_id": partner.id},
    )
    second = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/unions",
        headers=integration_env.auth_headers_for(staff_user),
        json={"partner_a_person_id": partner.id, "partner_b_person_id": parent.id},
    )

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "Union already exists for this pair"


def test_union_rejects_person_from_another_family(
    integration_env,
    staff_user,
    outsider_user,
    sample_family,
    sample_people,
):
    parent, _, _ = sample_people
    other_family = integration_env.create_family(owner=outsider_user, title="Other Family")
    outsider_person = integration_env.create_person(family=other_family, full_name="Other Person")

    response = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/unions",
        headers=integration_env.auth_headers_for(staff_user),
        json={"partner_a_person_id": parent.id, "partner_b_person_id": outsider_person.id},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == f"Person {outsider_person.id} does not belong to family"


def test_delete_parent_child_link_success_and_missing_link(
    integration_env,
    staff_user,
    sample_family,
    sample_people,
):
    parent, _, child = sample_people
    link = integration_env.create_parent_child_link(family=sample_family, parent=parent, child=child)

    delete = integration_env.client.delete(
        f"/api/v1/families/{sample_family.id}/parent-child-links/{link.id}",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert delete.status_code == 200
    assert delete.json() == {"message": "Parent-child link deleted"}
    assert integration_env.fetch_link(link.id) is None

    missing = integration_env.client.delete(
        f"/api/v1/families/{sample_family.id}/parent-child-links/9999",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert missing.status_code == 404
    assert missing.json()["detail"] == "Link not found"
