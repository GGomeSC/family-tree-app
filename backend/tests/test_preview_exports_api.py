from __future__ import annotations

from pathlib import Path

from app.core.config import settings


def test_preview_requires_at_least_one_person(integration_env, staff_user, sample_family):
    response = integration_env.client.get(
        f"/api/v1/families/{sample_family.id}/preview",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Family has no persons"


def test_export_requires_at_least_one_person(integration_env, staff_user, sample_family):
    response = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/export/pdf",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Family has no persons"


def test_export_returns_503_when_pdf_backend_is_unavailable(
    integration_env,
    monkeypatch,
    staff_user,
    sample_family,
):
    integration_env.create_person(family=sample_family, full_name="Mario Rossi", is_richiedente=True)
    monkeypatch.setattr("app.api.v1.routes.exports.build_layout", lambda persons, unions, links: None)
    monkeypatch.setattr("app.api.v1.routes.exports.render_html", lambda layout, family: "<html></html>")
    monkeypatch.setattr(
        "app.api.v1.routes.exports.export_pdf",
        lambda html, family_id: (_ for _ in ()).throw(RuntimeError("WeasyPrint is not installed or unavailable")),
    )

    response = integration_env.client.post(
        f"/api/v1/families/{sample_family.id}/export/pdf",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "WeasyPrint is not installed or unavailable"


def test_download_export_returns_404_for_missing_export(integration_env, staff_user):
    response = integration_env.client.get(
        "/api/v1/exports/9999/download",
        headers=integration_env.auth_headers_for(staff_user),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Export not found"


def test_download_export_is_scoped_to_visible_family(
    integration_env,
    staff_user,
    outsider_user,
):
    family = integration_env.create_family(owner=staff_user, title="Owned Family")
    export = integration_env.create_export(family=family, user=staff_user, file_path="owned.pdf")
    (Path(settings.export_dir) / "owned.pdf").write_bytes(b"%PDF-1.4 owned")

    response = integration_env.client.get(
        f"/api/v1/exports/{export.id}/download",
        headers=integration_env.auth_headers_for(outsider_user),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Family not found"


def test_list_exports_is_scoped_to_visible_family(integration_env, staff_user, outsider_user):
    family = integration_env.create_family(owner=staff_user, title="Owned Family")
    integration_env.create_export(family=family, user=staff_user, file_path="owned.pdf")

    response = integration_env.client.get(
        f"/api/v1/families/{family.id}/exports",
        headers=integration_env.auth_headers_for(outsider_user),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Family not found"
