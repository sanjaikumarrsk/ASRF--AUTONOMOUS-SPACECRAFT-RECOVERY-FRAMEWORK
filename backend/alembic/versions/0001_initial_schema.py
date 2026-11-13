"""Create the AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK telemetry and recovery schema."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def uuid_column(name: str, nullable: bool = False) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def upgrade() -> None:
    op.create_table(
        "spacecraft_telemetry",
        uuid_column("id"),
        sa.Column("subsystem_id", sa.String(length=64), nullable=False),
        sa.Column("processor_temperature", sa.Float(), nullable=False),
        sa.Column("power_draw", sa.Float(), nullable=False),
        sa.Column("battery_level", sa.Float(), nullable=False),
        sa.Column("communication_delay", sa.Float(), nullable=False),
        sa.Column("processor_load", sa.Float(), nullable=False),
        sa.Column("memory_utilization", sa.Float(), nullable=True),
        sa.Column("storage_utilization", sa.Float(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_telemetry_subsystem_timestamp", "spacecraft_telemetry", ["subsystem_id", "timestamp"])
    op.create_index("idx_telemetry_timestamp", "spacecraft_telemetry", ["timestamp"])

    op.create_table(
        "fault_detection",
        uuid_column("id"),
        sa.Column("subsystem_id", sa.String(length=64), nullable=False),
        sa.Column("fault_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("detection_timestamp", sa.DateTime(timezone=True), nullable=False),
        uuid_column("telemetry_id", nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.String(length=2000), nullable=True),
        sa.ForeignKeyConstraint(["telemetry_id"], ["spacecraft_telemetry.id"], name="fk_fault_telemetry"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_fault_subsystem_detected", "fault_detection", ["subsystem_id", "detection_timestamp"])
    op.create_index("idx_fault_status_severity", "fault_detection", ["status", "severity"])

    op.create_table(
        "recovery_strategies",
        uuid_column("id"),
        uuid_column("fault_id", nullable=True),
        sa.Column("subsystem_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("policy_recommendation", sa.String(length=2000), nullable=True),
        sa.Column("decision_context", sa.JSON(), nullable=True),
        sa.Column("execution_eligibility", sa.String(length=40), nullable=False),
        sa.Column("approval_status", sa.String(length=16), nullable=False),
        sa.Column("approved_by", sa.String(length=120), nullable=True),
        sa.Column("approved_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["fault_id"], ["fault_detection.id"], name="fk_strategy_fault"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_strategy_fault_created", "recovery_strategies", ["fault_id", "created_timestamp"])
    op.create_index("idx_strategy_approval", "recovery_strategies", ["approval_status"])

    op.create_table(
        "command_verification",
        uuid_column("id"),
        uuid_column("strategy_id", nullable=True),
        sa.Column("command_id", sa.String(length=120), nullable=False),
        sa.Column("proposed_command", sa.String(length=2000), nullable=False),
        sa.Column("verification_method", sa.String(length=80), nullable=False),
        sa.Column("verification_status", sa.String(length=24), nullable=False),
        sa.Column("validation_result", sa.String(length=2000), nullable=False),
        sa.Column("actor", sa.String(length=120), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["strategy_id"], ["recovery_strategies.id"], name="fk_verification_strategy"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_verification_strategy_timestamp", "command_verification", ["strategy_id", "timestamp"])
    op.create_index("idx_verification_status", "command_verification", ["verification_status"])

    op.create_table(
        "recovery_outcomes",
        uuid_column("id"),
        uuid_column("fault_id", nullable=True),
        uuid_column("strategy_id", nullable=True),
        uuid_column("verification_id", nullable=True),
        sa.Column("replication_result", sa.String(length=2000), nullable=True),
        sa.Column("recovery_outcome", sa.String(length=80), nullable=False),
        sa.Column("mission_status", sa.String(length=40), nullable=False),
        sa.Column("execution_status", sa.String(length=40), nullable=False),
        sa.Column("execution_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("diagnostic_explanation", sa.String(length=2000), nullable=True),
        sa.ForeignKeyConstraint(["fault_id"], ["fault_detection.id"], name="fk_outcome_fault"),
        sa.ForeignKeyConstraint(["strategy_id"], ["recovery_strategies.id"], name="fk_outcome_strategy"),
        sa.ForeignKeyConstraint(["verification_id"], ["command_verification.id"], name="fk_outcome_verification"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_outcome_fault_execution", "recovery_outcomes", ["fault_id", "execution_timestamp"])
    op.create_index("idx_outcome_mission_status", "recovery_outcomes", ["mission_status"])


def downgrade() -> None:
    op.drop_index("idx_outcome_mission_status", table_name="recovery_outcomes")
    op.drop_index("idx_outcome_fault_execution", table_name="recovery_outcomes")
    op.drop_table("recovery_outcomes")
    op.drop_index("idx_verification_status", table_name="command_verification")
    op.drop_index("idx_verification_strategy_timestamp", table_name="command_verification")
    op.drop_table("command_verification")
    op.drop_index("idx_strategy_approval", table_name="recovery_strategies")
    op.drop_index("idx_strategy_fault_created", table_name="recovery_strategies")
    op.drop_table("recovery_strategies")
    op.drop_index("idx_fault_status_severity", table_name="fault_detection")
    op.drop_index("idx_fault_subsystem_detected", table_name="fault_detection")
    op.drop_table("fault_detection")
    op.drop_index("idx_telemetry_timestamp", table_name="spacecraft_telemetry")
    op.drop_index("idx_telemetry_subsystem_timestamp", table_name="spacecraft_telemetry")
    op.drop_table("spacecraft_telemetry")
