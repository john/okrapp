"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-07 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enums ---
    # Use DO blocks so re-runs after a partial failure are safe.
    # We then reference these types via postgresql.ENUM(create_type=False),
    # which (unlike sa.Enum) truly skips the CREATE TYPE event on create_table.
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE authprovider AS ENUM ('auth0', 'entra');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE orgtype AS ENUM ('program', 'initiative');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE goalstatus AS ENUM ('draft', 'active', 'archived');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE goaltype AS ENUM ('objective', 'key_result');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE assessmentstatus AS ENUM ('not_started', 'on_track', 'at_risk', 'off_track', 'completed');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE confidence AS ENUM ('low', 'medium', 'high');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("sub", sa.String, nullable=False),
        sa.Column("auth_provider", PgEnum(name="authprovider", create_type=False), nullable=False),
        sa.Column("name", sa.String, nullable=True),
        sa.Column("email", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("auth_provider", "sub", name="uq_users_provider_sub"),
        sa.CheckConstraint(
            "email IS NULL OR lower(email) ~ '^[^@]+@rmi\\.org$'",
            name="email_rmi_domain_check",
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])

    # --- organizations ---
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column(
            "org_type",
            PgEnum(name="orgtype", create_type=False),
            nullable=False,
            server_default="program",
        ),
        sa.Column("parent_id", sa.Integer, sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("name", "parent_id", name="uq_organizations_name_parent"),
        sa.CheckConstraint("parent_id != id", name="ck_organizations_no_self_parent"),
    )
    op.create_index("ix_organizations_parent_id", "organizations", ["parent_id"])
    op.create_index("ix_organizations_deleted_at", "organizations", ["deleted_at"])

    # --- goals ---
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("parent_goal_id", sa.Integer, sa.ForeignKey("goals.id"), nullable=True),
        sa.Column("title", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", PgEnum(name="goalstatus", create_type=False), nullable=False),
        sa.Column("goal_type", PgEnum(name="goaltype", create_type=False), nullable=False),
        sa.Column("organization_id", sa.Integer, sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("end_date >= start_date", name="ck_goals_end_date_after_start"),
    )
    op.create_index("ix_goals_parent_goal_id", "goals", ["parent_goal_id"])
    op.create_index("ix_goals_organization_id", "goals", ["organization_id"])
    op.create_index("ix_goals_deleted_at", "goals", ["deleted_at"])

    # --- assessments ---
    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("goal_id", sa.Integer, sa.ForeignKey("goals.id"), nullable=False),
        sa.Column("assessment_date", sa.DateTime(timezone=False), nullable=False),
        sa.Column("period_start", sa.Date, nullable=True),
        sa.Column("period_end", sa.Date, nullable=True),
        sa.Column("status", PgEnum(name="assessmentstatus", create_type=False), nullable=False),
        sa.Column("score", sa.Numeric(5, 2), nullable=True),
        sa.Column("confidence", PgEnum(name="confidence", create_type=False), nullable=True),
        sa.Column("narrative", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 100)",
            name="ck_assessments_score_range",
        ),
    )
    op.create_index("ix_assessments_goal_id", "assessments", ["goal_id"])
    op.create_index("ix_assessments_assessment_date", "assessments", ["assessment_date"])
    op.create_index("ix_assessments_deleted_at", "assessments", ["deleted_at"])
    # Functional unique index: one assessment per goal per calendar day.
    # Cast to timestamp (dropping tz) so date_trunc is IMMUTABLE and usable in an index.
    op.execute(
        "CREATE UNIQUE INDEX uq_assessment_goal_day ON assessments "
        "(goal_id, date_trunc('day', assessment_date))"
    )

    # --- users_organizations ---
    op.create_table(
        "users_organizations",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.Integer, sa.ForeignKey("organizations.id"), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_organizations_deleted_at", "users_organizations", ["deleted_at"])


def downgrade() -> None:
    op.drop_table("users_organizations")
    op.drop_table("assessments")
    op.drop_table("goals")
    op.drop_table("organizations")
    op.drop_table("users")

    for name in ["confidence", "assessmentstatus", "goaltype", "goalstatus", "orgtype", "authprovider"]:
        op.execute(f"DROP TYPE IF EXISTS {name}")
