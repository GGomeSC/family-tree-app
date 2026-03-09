from __future__ import annotations

from datetime import UTC, datetime
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


VERSIONS_DIR = Path(__file__).resolve().parents[1] / "alembic" / "versions"


def _load_revision(filename: str, module_name: str) -> ModuleType:
    spec = spec_from_file_location(module_name, VERSIONS_DIR / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load migration {filename}")

    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_upgrade(connection: sa.Connection, revision_module: ModuleType) -> None:
    context = MigrationContext.configure(connection)
    operations = Operations(context)
    original_op = revision_module.op
    revision_module.op = operations
    try:
        revision_module.upgrade()
    finally:
        revision_module.op = original_op


def test_rename_case_schema_to_family_preserves_existing_data(tmp_path: Path):
    initial = _load_revision("0001_initial.py", "migration_0001_initial")
    rename = _load_revision("0002_rename_cases_to_families.py", "migration_0002_rename_cases_to_families")

    db_path = tmp_path / "family-migration.sqlite"
    engine = sa.create_engine(f"sqlite:///{db_path}")
    now = datetime.now(UTC).isoformat()

    with engine.begin() as connection:
        _run_upgrade(connection, initial)

        connection.execute(
            sa.text(
                """
                INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
                VALUES (:id, :name, :email, :password_hash, :role, :is_active, :created_at)
                """
            ),
            {
                "id": 1,
                "name": "Admin",
                "email": "admin@example.com",
                "password_hash": "hashed",
                "role": "ADMIN",
                "is_active": True,
                "created_at": now,
            },
        )
        connection.execute(
            sa.text(
                """
                INSERT INTO cases (id, title, client_reference, status, created_by, created_at, updated_at, archived_at)
                VALUES (:id, :title, :client_reference, :status, :created_by, :created_at, :updated_at, :archived_at)
                """
            ),
            {
                "id": 1,
                "title": "Família Rossi",
                "client_reference": "CLI-001",
                "status": "DRAFT",
                "created_by": 1,
                "created_at": now,
                "updated_at": now,
                "archived_at": None,
            },
        )
        connection.execute(
            sa.text(
                """
                INSERT INTO persons (id, case_id, full_name, birth_date, is_richiedente, notes, created_at, updated_at)
                VALUES (:id, :case_id, :full_name, :birth_date, :is_richiedente, :notes, :created_at, :updated_at)
                """
            ),
            [
                {
                    "id": 1,
                    "case_id": 1,
                    "full_name": "Mario Rossi",
                    "birth_date": "1900-01-01",
                    "is_richiedente": False,
                    "notes": None,
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "id": 2,
                    "case_id": 1,
                    "full_name": "Luigi Rossi",
                    "birth_date": "1930-01-01",
                    "is_richiedente": True,
                    "notes": None,
                    "created_at": now,
                    "updated_at": now,
                },
            ],
        )
        connection.execute(
            sa.text(
                """
                INSERT INTO unions (id, case_id, partner_a_person_id, partner_b_person_id, marriage_date)
                VALUES (:id, :case_id, :partner_a_person_id, :partner_b_person_id, :marriage_date)
                """
            ),
            {
                "id": 1,
                "case_id": 1,
                "partner_a_person_id": 1,
                "partner_b_person_id": 2,
                "marriage_date": None,
            },
        )
        connection.execute(
            sa.text(
                """
                INSERT INTO parent_child_links (id, case_id, parent_person_id, child_person_id)
                VALUES (:id, :case_id, :parent_person_id, :child_person_id)
                """
            ),
            {
                "id": 1,
                "case_id": 1,
                "parent_person_id": 1,
                "child_person_id": 2,
            },
        )
        connection.execute(
            sa.text(
                """
                INSERT INTO exports (id, case_id, exported_by, format, template_version, file_path, created_at)
                VALUES (:id, :case_id, :exported_by, :format, :template_version, :file_path, :created_at)
                """
            ),
            {
                "id": 1,
                "case_id": 1,
                "exported_by": 1,
                "format": "pdf",
                "template_version": "v1",
                "file_path": "/tmp/family.pdf",
                "created_at": now,
            },
        )

        _run_upgrade(connection, rename)

        inspector = sa.inspect(connection)
        tables = set(inspector.get_table_names())
        assert "families" in tables
        assert "cases" not in tables

        family_columns = {column["name"] for column in inspector.get_columns("families")}
        assert "id" in family_columns
        assert "title" in family_columns
        assert "status" in family_columns

        for table_name in ("persons", "unions", "parent_child_links", "exports"):
            columns = {column["name"] for column in inspector.get_columns(table_name)}
            assert "family_id" in columns
            assert "case_id" not in columns

        family_row = connection.execute(
            sa.text("SELECT id, title, client_reference, status FROM families WHERE id = 1")
        ).mappings().one()
        assert family_row["id"] == 1
        assert family_row["title"] == "Família Rossi"
        assert family_row["client_reference"] == "CLI-001"
        assert family_row["status"] == "DRAFT"

        person_family_ids = connection.execute(
            sa.text("SELECT family_id FROM persons ORDER BY id")
        ).scalars().all()
        assert person_family_ids == [1, 1]

        union_family_id = connection.execute(
            sa.text("SELECT family_id FROM unions WHERE id = 1")
        ).scalar_one()
        assert union_family_id == 1

        link_family_id = connection.execute(
            sa.text("SELECT family_id FROM parent_child_links WHERE id = 1")
        ).scalar_one()
        assert link_family_id == 1

        export_row = connection.execute(
            sa.text("SELECT family_id, file_path FROM exports WHERE id = 1")
        ).mappings().one()
        assert export_row["family_id"] == 1
        assert export_row["file_path"] == "/tmp/family.pdf"


def test_normalize_export_file_paths_to_filename_only(tmp_path: Path):
    initial = _load_revision("0001_initial.py", "migration_0001_initial_normalize")
    rename = _load_revision("0002_rename_cases_to_families.py", "migration_0002_rename_cases_to_families_normalize")
    normalize = _load_revision("0003_normalize_export_file_paths.py", "migration_0003_normalize_export_file_paths")

    db_path = tmp_path / "family-migration-normalize.sqlite"
    engine = sa.create_engine(f"sqlite:///{db_path}")
    now = datetime.now(UTC).isoformat()

    with engine.begin() as connection:
        _run_upgrade(connection, initial)
        _run_upgrade(connection, rename)

        connection.execute(
            sa.text(
                """
                INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
                VALUES (:id, :name, :email, :password_hash, :role, :is_active, :created_at)
                """
            ),
            {
                "id": 1,
                "name": "Admin",
                "email": "admin@example.com",
                "password_hash": "hashed",
                "role": "ADMIN",
                "is_active": True,
                "created_at": now,
            },
        )
        connection.execute(
            sa.text(
                """
                INSERT INTO families (id, title, client_reference, status, created_by, created_at, updated_at, archived_at)
                VALUES (:id, :title, :client_reference, :status, :created_by, :created_at, :updated_at, :archived_at)
                """
            ),
            {
                "id": 1,
                "title": "Família Bianchi",
                "client_reference": "CLI-002",
                "status": "DRAFT",
                "created_by": 1,
                "created_at": now,
                "updated_at": now,
                "archived_at": None,
            },
        )
        connection.execute(
            sa.text(
                """
                INSERT INTO exports (id, family_id, exported_by, format, template_version, file_path, created_at)
                VALUES (:id, :family_id, :exported_by, :format, :template_version, :file_path, :created_at)
                """
            ),
            [
                {
                    "id": 1,
                    "family_id": 1,
                    "exported_by": 1,
                    "format": "pdf",
                    "template_version": "v1",
                    "file_path": "/tmp/family_1.pdf",
                    "created_at": now,
                },
                {
                    "id": 2,
                    "family_id": 1,
                    "exported_by": 1,
                    "format": "pdf",
                    "template_version": "v1",
                    "file_path": r"C:\exports\family_2.pdf",
                    "created_at": now,
                },
                {
                    "id": 3,
                    "family_id": 1,
                    "exported_by": 1,
                    "format": "pdf",
                    "template_version": "v1",
                    "file_path": "family_3.pdf",
                    "created_at": now,
                },
            ],
        )

        _run_upgrade(connection, normalize)

        rows = connection.execute(sa.text("SELECT id, file_path FROM exports ORDER BY id")).mappings().all()
        assert rows[0]["file_path"] == "family_1.pdf"
        assert rows[1]["file_path"] == "family_2.pdf"
        assert rows[2]["file_path"] == "family_3.pdf"
