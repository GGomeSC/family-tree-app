"""rename cases to families

Revision ID: 0002_rename_cases_to_families
Revises: 0001_initial
Create Date: 2026-03-06
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_rename_cases_to_families"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _is_postgresql() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def _rename_case_fk_column(table_name: str, old_index: str, new_index: str) -> None:
    if _is_postgresql():
        op.drop_index(old_index, table_name=table_name)
        op.alter_column(table_name, "case_id", new_column_name="family_id", existing_type=sa.Integer(), existing_nullable=False)
        op.create_index(new_index, table_name, ["family_id"])
        return

    with op.batch_alter_table(table_name, recreate="always") as batch_op:
        batch_op.drop_index(old_index)
        batch_op.alter_column("case_id", new_column_name="family_id", existing_type=sa.Integer(), existing_nullable=False)
    op.create_index(new_index, table_name, ["family_id"])


def _rename_family_fk_column(table_name: str, old_index: str, new_index: str) -> None:
    if _is_postgresql():
        op.drop_index(old_index, table_name=table_name)
        op.alter_column(table_name, "family_id", new_column_name="case_id", existing_type=sa.Integer(), existing_nullable=False)
        op.create_index(new_index, table_name, ["case_id"])
        return

    with op.batch_alter_table(table_name, recreate="always") as batch_op:
        batch_op.alter_column("family_id", new_column_name="case_id", existing_type=sa.Integer(), existing_nullable=False)
    op.create_index(new_index, table_name, ["case_id"])


def upgrade() -> None:
    op.rename_table("cases", "families")
    op.drop_index("ix_cases_id", table_name="families")
    op.create_index("ix_families_id", "families", ["id"])

    if _is_postgresql():
        op.execute("ALTER TYPE casestatus RENAME TO familystatus")

    _rename_case_fk_column("persons", "ix_persons_case_id", "ix_persons_family_id")

    if _is_postgresql():
        op.drop_index("ix_unions_case_id", table_name="unions")
        op.drop_constraint("uq_union_pair", "unions", type_="unique")
        op.alter_column("unions", "case_id", new_column_name="family_id", existing_type=sa.Integer(), existing_nullable=False)
        op.create_unique_constraint("uq_union_pair", "unions", ["family_id", "partner_a_person_id", "partner_b_person_id"])
        op.create_index("ix_unions_family_id", "unions", ["family_id"])
    else:
        with op.batch_alter_table("unions", recreate="always") as batch_op:
            batch_op.drop_index("ix_unions_case_id")
            batch_op.drop_constraint("uq_union_pair", type_="unique")
            batch_op.alter_column("case_id", new_column_name="family_id", existing_type=sa.Integer(), existing_nullable=False)
            batch_op.create_unique_constraint("uq_union_pair", ["family_id", "partner_a_person_id", "partner_b_person_id"])
        op.create_index("ix_unions_family_id", "unions", ["family_id"])

    if _is_postgresql():
        op.drop_index("ix_parent_child_links_case_id", table_name="parent_child_links")
        op.drop_constraint("uq_parent_child", "parent_child_links", type_="unique")
        op.alter_column(
            "parent_child_links",
            "case_id",
            new_column_name="family_id",
            existing_type=sa.Integer(),
            existing_nullable=False,
        )
        op.create_unique_constraint("uq_parent_child", "parent_child_links", ["family_id", "parent_person_id", "child_person_id"])
        op.create_index("ix_parent_child_links_family_id", "parent_child_links", ["family_id"])
    else:
        with op.batch_alter_table("parent_child_links", recreate="always") as batch_op:
            batch_op.drop_index("ix_parent_child_links_case_id")
            batch_op.drop_constraint("uq_parent_child", type_="unique")
            batch_op.alter_column("case_id", new_column_name="family_id", existing_type=sa.Integer(), existing_nullable=False)
            batch_op.create_unique_constraint("uq_parent_child", ["family_id", "parent_person_id", "child_person_id"])
        op.create_index("ix_parent_child_links_family_id", "parent_child_links", ["family_id"])

    _rename_case_fk_column("exports", "ix_exports_case_id", "ix_exports_family_id")


def downgrade() -> None:
    _rename_family_fk_column("exports", "ix_exports_family_id", "ix_exports_case_id")

    if _is_postgresql():
        op.drop_index("ix_parent_child_links_family_id", table_name="parent_child_links")
        op.drop_constraint("uq_parent_child", "parent_child_links", type_="unique")
        op.alter_column(
            "parent_child_links",
            "family_id",
            new_column_name="case_id",
            existing_type=sa.Integer(),
            existing_nullable=False,
        )
        op.create_unique_constraint("uq_parent_child", "parent_child_links", ["case_id", "parent_person_id", "child_person_id"])
        op.create_index("ix_parent_child_links_case_id", "parent_child_links", ["case_id"])
    else:
        op.drop_index("ix_parent_child_links_family_id", table_name="parent_child_links")
        with op.batch_alter_table("parent_child_links", recreate="always") as batch_op:
            batch_op.drop_constraint("uq_parent_child", type_="unique")
            batch_op.alter_column("family_id", new_column_name="case_id", existing_type=sa.Integer(), existing_nullable=False)
            batch_op.create_unique_constraint("uq_parent_child", ["case_id", "parent_person_id", "child_person_id"])
        op.create_index("ix_parent_child_links_case_id", "parent_child_links", ["case_id"])

    if _is_postgresql():
        op.drop_index("ix_unions_family_id", table_name="unions")
        op.drop_constraint("uq_union_pair", "unions", type_="unique")
        op.alter_column("unions", "family_id", new_column_name="case_id", existing_type=sa.Integer(), existing_nullable=False)
        op.create_unique_constraint("uq_union_pair", "unions", ["case_id", "partner_a_person_id", "partner_b_person_id"])
        op.create_index("ix_unions_case_id", "unions", ["case_id"])
    else:
        op.drop_index("ix_unions_family_id", table_name="unions")
        with op.batch_alter_table("unions", recreate="always") as batch_op:
            batch_op.drop_constraint("uq_union_pair", type_="unique")
            batch_op.alter_column("family_id", new_column_name="case_id", existing_type=sa.Integer(), existing_nullable=False)
            batch_op.create_unique_constraint("uq_union_pair", ["case_id", "partner_a_person_id", "partner_b_person_id"])
        op.create_index("ix_unions_case_id", "unions", ["case_id"])

    _rename_family_fk_column("persons", "ix_persons_family_id", "ix_persons_case_id")

    if _is_postgresql():
        op.execute("ALTER TYPE familystatus RENAME TO casestatus")

    op.drop_index("ix_families_id", table_name="families")
    op.create_index("ix_cases_id", "families", ["id"])
    op.rename_table("families", "cases")
