"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-03-02
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("ADMIN", "STAFF", name="userrole"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("client_reference", sa.String(length=255), nullable=True),
        sa.Column("status", sa.Enum("DRAFT", "REVIEWED", "EXPORTED", "ARCHIVED", name="casestatus"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_cases_id", "cases", ["id"])

    op.create_table(
        "persons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("is_richiedente", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_persons_id", "persons", ["id"])
    op.create_index("ix_persons_case_id", "persons", ["case_id"])

    op.create_table(
        "unions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("partner_a_person_id", sa.Integer(), sa.ForeignKey("persons.id"), nullable=False),
        sa.Column("partner_b_person_id", sa.Integer(), sa.ForeignKey("persons.id"), nullable=False),
        sa.Column("marriage_date", sa.Date(), nullable=True),
        sa.UniqueConstraint("case_id", "partner_a_person_id", "partner_b_person_id", name="uq_union_pair"),
    )
    op.create_index("ix_unions_id", "unions", ["id"])
    op.create_index("ix_unions_case_id", "unions", ["case_id"])

    op.create_table(
        "parent_child_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("parent_person_id", sa.Integer(), sa.ForeignKey("persons.id"), nullable=False),
        sa.Column("child_person_id", sa.Integer(), sa.ForeignKey("persons.id"), nullable=False),
        sa.UniqueConstraint("case_id", "parent_person_id", "child_person_id", name="uq_parent_child"),
    )
    op.create_index("ix_parent_child_links_id", "parent_child_links", ["id"])
    op.create_index("ix_parent_child_links_case_id", "parent_child_links", ["case_id"])

    op.create_table(
        "exports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("exported_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("format", sa.String(length=20), nullable=False),
        sa.Column("template_version", sa.String(length=50), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_exports_id", "exports", ["id"])
    op.create_index("ix_exports_case_id", "exports", ["case_id"])


def downgrade() -> None:
    op.drop_index("ix_exports_case_id", table_name="exports")
    op.drop_index("ix_exports_id", table_name="exports")
    op.drop_table("exports")

    op.drop_index("ix_parent_child_links_case_id", table_name="parent_child_links")
    op.drop_index("ix_parent_child_links_id", table_name="parent_child_links")
    op.drop_table("parent_child_links")

    op.drop_index("ix_unions_case_id", table_name="unions")
    op.drop_index("ix_unions_id", table_name="unions")
    op.drop_table("unions")

    op.drop_index("ix_persons_case_id", table_name="persons")
    op.drop_index("ix_persons_id", table_name="persons")
    op.drop_table("persons")

    op.drop_index("ix_cases_id", table_name="cases")
    op.drop_table("cases")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS casestatus")
    op.execute("DROP TYPE IF EXISTS userrole")
