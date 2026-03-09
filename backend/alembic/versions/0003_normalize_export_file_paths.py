"""normalize export file paths to filename only

Revision ID: 0003_normalize_export_file_paths
Revises: 0002_rename_cases_to_families
Create Date: 2026-03-09
"""

from pathlib import PurePath, PureWindowsPath

from alembic import op
import sqlalchemy as sa


revision = "0003_normalize_export_file_paths"
down_revision = "0002_rename_cases_to_families"
branch_labels = None
depends_on = None


def _extract_filename(value: str) -> str:
    unix_name = PurePath(value).name
    windows_name = PureWindowsPath(value).name
    return windows_name if len(windows_name) < len(unix_name) else unix_name


def upgrade() -> None:
    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, file_path FROM exports")).mappings().all()
    for row in rows:
        file_path = row["file_path"] or ""
        normalized = _extract_filename(file_path)
        connection.execute(
            sa.text("UPDATE exports SET file_path = :file_path WHERE id = :id"),
            {"id": row["id"], "file_path": normalized},
        )


def downgrade() -> None:
    # Data-only migration: original absolute paths cannot be reconstructed.
    pass
