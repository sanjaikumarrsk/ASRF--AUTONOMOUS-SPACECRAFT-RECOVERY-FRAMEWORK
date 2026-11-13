import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    SCIENTIST = "SCIENTIST"
    AUDITOR = "AUDITOR"


class FaultSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FaultStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    ACKNOWLEDGED = "ACKNOWLEDGED"


class ApprovalStatus(str, enum.Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ComponentStatus(str, enum.Enum):
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"
    OFFLINE = "OFFLINE"
    FAULT_DETECTED = "FAULT_DETECTED"


# -------------------------------------------------------------
# 1. USER AUTHENTICATION
# -------------------------------------------------------------
class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_username", "username", unique=True),
        Index("idx_users_email", "email", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    username: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="SCIENTIST")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# -------------------------------------------------------------
# 2. SPACECRAFT 50+ COMPONENTS INVENTORY
# -------------------------------------------------------------
class SpacecraftComponent(Base):
    __tablename__ = "spacecraft_components"
    __table_args__ = (
        Index("idx_comp_subsystem", "subsystem"),
        Index("idx_comp_status", "current_status"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g. CMP-FC-001
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    subsystem: Mapped[str] = mapped_column(String(64), nullable=False)  # flight_computer, power, thermal, etc.
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    operating_purpose: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    sensor_type: Mapped[str] = mapped_column(String(80), nullable=False)
    operating_unit: Mapped[str] = mapped_column(String(32), nullable=False)
    normal_range_min: Mapped[float] = mapped_column(Float, nullable=False)
    normal_range_max: Mapped[float] = mapped_column(Float, nullable=False)
    warning_threshold: Mapped[float] = mapped_column(Float, nullable=False)
    critical_threshold: Mapped[float] = mapped_column(Float, nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False)
    health_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    current_status: Mapped[str] = mapped_column(String(32), nullable=False, default="HEALTHY")
    fault_status: Mapped[str] = mapped_column(String(64), nullable=False, default="NOMINAL")
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    readings: Mapped[list["ComponentTelemetryReading"]] = relationship(back_populates="component", cascade="all, delete-orphan")


class ComponentTelemetryReading(Base):
    __tablename__ = "telemetry_readings"
    __table_args__ = (
        Index("idx_reading_comp_time", "component_id", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id: Mapped[str] = mapped_column(ForeignKey("spacecraft_components.id", name="fk_reading_comp"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    sensor_name: Mapped[str] = mapped_column(String(80), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="NOMINAL")

    component: Mapped["SpacecraftComponent"] = relationship(back_populates="readings")


class ComponentHealthHistory(Base):
    __tablename__ = "component_health_history"
    __table_args__ = (
        Index("idx_health_comp_time", "component_id", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    health_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)


# -------------------------------------------------------------
# 3. EXISTING SPACECRAFT TELEMETRY (Preserved for backwards compatibility)
# -------------------------------------------------------------
class SpacecraftTelemetry(Base):
    __tablename__ = "spacecraft_telemetry"
    __table_args__ = (
        Index("idx_telemetry_subsystem_timestamp", "subsystem_id", "timestamp"),
        Index("idx_telemetry_timestamp", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subsystem_id: Mapped[str] = mapped_column(String(64), nullable=False)
    processor_temperature: Mapped[float] = mapped_column(Float, nullable=False)
    power_draw: Mapped[float] = mapped_column(Float, nullable=False)
    battery_level: Mapped[float] = mapped_column(Float, nullable=False)
    communication_delay: Mapped[float] = mapped_column(Float, nullable=False)
    processor_load: Mapped[float] = mapped_column(Float, nullable=False)
    memory_utilization: Mapped[float | None] = mapped_column(Float)
    storage_utilization: Mapped[float | None] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    faults: Mapped[list["FaultDetection"]] = relationship(back_populates="telemetry")


# -------------------------------------------------------------
# 4. FAULT DETECTION & AI ANALYSIS
# -------------------------------------------------------------
class FaultDetection(Base):
    __tablename__ = "fault_detection"
    __table_args__ = (
        Index("idx_fault_subsystem_detected", "subsystem_id", "detection_timestamp"),
        Index("idx_fault_status_severity", "status", "severity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(80), nullable=False, default="")  # EVT-PRC-0042
    component_id: Mapped[str | None] = mapped_column(String(64))
    subsystem_id: Mapped[str] = mapped_column(String(64), nullable=False)
    fault_type: Mapped[str] = mapped_column(String(80), nullable=False)
    severity: Mapped[FaultSeverity] = mapped_column(Enum(FaultSeverity, native_enum=False, length=16), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    detection_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    telemetry_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("spacecraft_telemetry.id", name="fk_fault_telemetry"))
    status: Mapped[FaultStatus] = mapped_column(Enum(FaultStatus, native_enum=False, length=20), nullable=False, default=FaultStatus.OPEN)
    anomaly_score: Mapped[float | None] = mapped_column(Float, default=0.87)
    root_cause_hypothesis: Mapped[str | None] = mapped_column(String(1000))
    confidence: Mapped[float | None] = mapped_column(Float, default=94.2)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_notes: Mapped[str | None] = mapped_column(String(2000))

    telemetry: Mapped[SpacecraftTelemetry | None] = relationship(back_populates="faults")
    strategies: Mapped[list["RecoveryStrategy"]] = relationship(back_populates="fault")
    outcomes: Mapped[list["RecoveryOutcome"]] = relationship(back_populates="fault")


class AiAnalysisRecord(Base):
    __tablename__ = "ai_analysis_records"
    __table_args__ = (
        Index("idx_ai_event", "event_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    fault_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    component_id: Mapped[str | None] = mapped_column(String(64))
    model_name: Mapped[str] = mapped_column(String(100), default="LSTM Fault Analyzer")
    sequence_length: Mapped[int] = mapped_column(Integer, default=30)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.87)
    fault_probability: Mapped[float] = mapped_column(Float, default=0.91)
    root_cause_confidence: Mapped[float] = mapped_column(Float, default=88.4)
    detected_pattern: Mapped[str] = mapped_column(String(500), default="Processor thermal-load instability")
    features_count: Mapped[int] = mapped_column(Integer, default=24)
    input_samples: Mapped[int] = mapped_column(Integer, default=60)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# -------------------------------------------------------------
# 5. PPO RECOVERY DECISIONS
# -------------------------------------------------------------
class PpoDecisionRecord(Base):
    __tablename__ = "ppo_decisions"
    __table_args__ = (
        Index("idx_ppo_event", "event_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision_id: Mapped[str] = mapped_column(String(80), nullable=False)  # PPO-2026-0087
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    fault_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    component_id: Mapped[str | None] = mapped_column(String(64))
    subsystem_id: Mapped[str] = mapped_column(String(64), nullable=False)
    state_vector: Mapped[dict | None] = mapped_column(JSON)
    candidate_actions: Mapped[list | None] = mapped_column(JSON)
    selected_action: Mapped[str] = mapped_column(String(120), nullable=False)
    action_parameters: Mapped[str] = mapped_column(String(500), default="Timeout: 12s")
    policy_confidence: Mapped[float] = mapped_column(Float, default=92.6)
    expected_reward: Mapped[float | None] = mapped_column(Float, default=0.94)
    actual_reward: Mapped[float | None] = mapped_column(Float, default=0.91)
    decision_mode: Mapped[str] = mapped_column(String(40), default="PPO_INFERENCE")
    model_version: Mapped[str] = mapped_column(String(40), default="ppo-spacecraft-v2.1")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# -------------------------------------------------------------
# 6. REPLICATION CORE TESTS
# -------------------------------------------------------------
class ReplicationTestRecord(Base):
    __tablename__ = "replication_tests"
    __table_args__ = (
        Index("idx_rep_event", "event_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    test_id: Mapped[str] = mapped_column(String(80), nullable=False)  # REP-2026-0841
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    component_id: Mapped[str | None] = mapped_column(String(64))
    candidate_action: Mapped[str] = mapped_column(String(120), nullable=False)
    initial_replica_state: Mapped[dict | None] = mapped_column(JSON)
    duration_seconds: Mapped[float] = mapped_column(Float, default=3.0)
    thermal_response: Mapped[str] = mapped_column(String(40), default="STABLE")
    power_response: Mapped[str] = mapped_column(String(40), default="ACCEPTABLE")
    cpu_response: Mapped[str] = mapped_column(String(40), default="NOMINAL")
    comm_response: Mapped[str] = mapped_column(String(40), default="NOMINAL")
    subsystem_recovery: Mapped[str] = mapped_column(String(40), default="SUCCESS")
    mission_continuity: Mapped[str] = mapped_column(String(40), default="PRESERVED")
    outcome_confidence: Mapped[float] = mapped_column(Float, default=93.7)
    risk: Mapped[str] = mapped_column(String(32), default="LOW")
    recommendation: Mapped[str] = mapped_column(String(160), default="PROCEED TO COMPUTATIONAL CORE")
    pass_fail: Mapped[str] = mapped_column(String(16), default="PASS")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# -------------------------------------------------------------
# 7. COMPUTATIONAL CORE & RECOVERY STRATEGY
# -------------------------------------------------------------
class RecoveryStrategy(Base):
    __tablename__ = "recovery_strategies"
    __table_args__ = (
        Index("idx_strategy_fault_created", "fault_id", "created_timestamp"),
        Index("idx_strategy_approval", "approval_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fault_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("fault_detection.id", name="fk_strategy_fault"))
    subsystem_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    policy_recommendation: Mapped[str | None] = mapped_column(String(2000))
    decision_context: Mapped[dict | None] = mapped_column(JSON)
    execution_eligibility: Mapped[str] = mapped_column(String(40), nullable=False, default="PROPOSAL_ONLY")
    approval_status: Mapped[ApprovalStatus] = mapped_column(Enum(ApprovalStatus, native_enum=False, length=16), nullable=False, default=ApprovalStatus.PROPOSED)
    approved_by: Mapped[str | None] = mapped_column(String(120))
    approved_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    fault: Mapped[FaultDetection | None] = relationship(back_populates="strategies")
    verifications: Mapped[list["CommandVerification"]] = relationship(back_populates="strategy")
    outcomes: Mapped[list["RecoveryOutcome"]] = relationship(back_populates="strategy")


class CommandVerification(Base):
    __tablename__ = "command_verification"
    __table_args__ = (
        Index("idx_verification_strategy_timestamp", "strategy_id", "timestamp"),
        Index("idx_verification_status", "verification_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str | None] = mapped_column(String(80))
    strategy_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("recovery_strategies.id", name="fk_verification_strategy"))
    command_id: Mapped[str] = mapped_column(String(120), nullable=False)  # CMD-PRC-042
    target_subsystem: Mapped[str] = mapped_column(String(64), default="Flight Computer")
    command_name: Mapped[str] = mapped_column(String(120), default="PROCESSOR_RESTART")
    proposed_command: Mapped[str] = mapped_column(String(2000), nullable=False)
    parameters: Mapped[str] = mapped_column(String(500), default="Timeout: 12s")
    validity: Mapped[str] = mapped_column(String(32), default="VALID")
    safety_check: Mapped[str] = mapped_column(String(32), default="PASSED")
    verified_library: Mapped[str] = mapped_column(String(32), default="VERIFIED")
    rollback_status: Mapped[str] = mapped_column(String(32), default="AVAILABLE")
    rollback_plan_id: Mapped[str] = mapped_column(String(80), default="RB-PRC-042")
    consistency_check: Mapped[str] = mapped_column(String(32), default="PASSED")
    authorization_status: Mapped[str] = mapped_column(String(32), default="AUTHORIZED")
    verification_method: Mapped[str] = mapped_column(String(80), nullable=False, default="SAFETY_AND_LIBRARY_CHECK")
    verification_status: Mapped[str] = mapped_column(String(24), nullable=False, default="PASSED")
    validation_result: Mapped[str] = mapped_column(String(2000), nullable=False, default="Command structure and safety constraints verified.")
    actor: Mapped[str | None] = mapped_column(String(120), default="COMPUTATIONAL_CORE")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    strategy: Mapped[RecoveryStrategy | None] = relationship(back_populates="verifications")
    outcomes: Mapped[list["RecoveryOutcome"]] = relationship(back_populates="command_verification")


# -------------------------------------------------------------
# 8. ROLLBACK RECORDS
# -------------------------------------------------------------
class RollbackRecord(Base):
    __tablename__ = "rollback_records"
    __table_args__ = (
        Index("idx_rollback_event", "event_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rollback_id: Mapped[str] = mapped_column(String(80), nullable=False)  # RB-PRC-042
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    command_id: Mapped[str] = mapped_column(String(120), nullable=False)
    reversal_path: Mapped[str] = mapped_column(String(500), default="Processor Restart -> Previous Operating State")
    estimated_recovery_seconds: Mapped[float] = mapped_column(Float, default=8.4)
    verification_status: Mapped[str] = mapped_column(String(32), default="PASSED")
    execution_status: Mapped[str] = mapped_column(String(32), default="STANDBY")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# -------------------------------------------------------------
# 9. EARTH VALIDATION & COMMUNICATION
# -------------------------------------------------------------
class EarthValidationRequest(Base):
    __tablename__ = "earth_validation_requests"
    __table_args__ = (
        Index("idx_earth_req_event", "event_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[str] = mapped_column(String(80), nullable=False)  # VAL-REQ-2026-0198
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    component_id: Mapped[str | None] = mapped_column(String(64))
    fault_details: Mapped[str] = mapped_column(String(1000), nullable=False)
    proposed_command: Mapped[str] = mapped_column(String(200), nullable=False)
    safety_analysis: Mapped[str] = mapped_column(String(1000), default="No critical hazard detected; rollback available.")
    transmission_delay_seconds: Mapped[float] = mapped_column(Float, default=12.8)
    status: Mapped[str] = mapped_column(String(32), default="CONFIRMED")  # PENDING, APPROVED, REJECTED, CONFIRMED
    sent_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class EarthValidationDecision(Base):
    __tablename__ = "earth_validation_decisions"
    __table_args__ = (
        Index("idx_earth_dec_event", "event_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision_id: Mapped[str] = mapped_column(String(80), nullable=False)  # DEC-EARTH-0198
    request_id: Mapped[str] = mapped_column(String(80), nullable=False)
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    decision_maker: Mapped[str] = mapped_column(String(120), default="FLIGHT_DIRECTOR_JPL")
    decision_status: Mapped[str] = mapped_column(String(32), default="ACCEPTED")  # ACCEPTED, REJECTED, MODIFIED
    approval_reason: Mapped[str] = mapped_column(String(1000), default="Replication Core test passed with 93.7% confidence; telemetry confirms safety margin.")
    approved_command: Mapped[str] = mapped_column(String(200), default="PROCESSOR_RESTART")
    conditions: Mapped[str] = mapped_column(String(500), default="Monitor telemetry for 120s post-restart before resuming science payload.")
    received_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CommunicationMessage(Base):
    __tablename__ = "communication_messages"
    __table_args__ = (
        Index("idx_comm_event", "event_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[str] = mapped_column(String(80), nullable=False)
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    direction: Mapped[str] = mapped_column(String(32), nullable=False)  # MARS_TO_EARTH, EARTH_TO_MARS
    content: Mapped[str] = mapped_column(Text, nullable=False)
    transmission_delay_seconds: Mapped[float] = mapped_column(Float, default=12.8)
    status: Mapped[str] = mapped_column(String(32), default="DELIVERED")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# -------------------------------------------------------------
# 10. RECOVERY OUTCOMES & MISSION CONTINUITY
# -------------------------------------------------------------
class RecoveryOutcome(Base):
    __tablename__ = "recovery_outcomes"
    __table_args__ = (
        Index("idx_outcome_fault_execution", "fault_id", "execution_timestamp"),
        Index("idx_outcome_mission_status", "mission_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str | None] = mapped_column(String(80))
    fault_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("fault_detection.id", name="fk_outcome_fault"))
    strategy_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("recovery_strategies.id", name="fk_outcome_strategy"))
    verification_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("command_verification.id", name="fk_outcome_verification"))
    replication_result: Mapped[str | None] = mapped_column(String(2000))
    recovery_outcome: Mapped[str] = mapped_column(String(80), nullable=False)
    mission_status: Mapped[str] = mapped_column(String(40), nullable=False)
    execution_status: Mapped[str] = mapped_column(String(40), nullable=False, default="EXECUTED")
    execution_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completion_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    diagnostic_explanation: Mapped[str | None] = mapped_column(String(2000))

    fault: Mapped[FaultDetection | None] = relationship(back_populates="outcomes")
    strategy: Mapped[RecoveryStrategy | None] = relationship(back_populates="outcomes")
    command_verification: Mapped[CommandVerification | None] = relationship(back_populates="outcomes")


# -------------------------------------------------------------
# 11. EVENT TIMELINE & MISSION LIFECYCLE
# -------------------------------------------------------------
class MissionEvent(Base):
    __tablename__ = "mission_events"
    __table_args__ = (
        Index("idx_event_timeline", "event_id", "timeline_offset"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)  # EVT-PRC-0042
    timeline_offset: Mapped[str] = mapped_column(String(24), nullable=False)  # T+00:00
    stage: Mapped[str] = mapped_column(String(64), nullable=False)  # TELEMETRY_ANOMALY, LSTM_ANALYSIS, etc.
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="COMPLETED")
    subsystem: Mapped[str] = mapped_column(String(64), default="Flight Computer")
    component_id: Mapped[str | None] = mapped_column(String(64))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# -------------------------------------------------------------
# 12. DOCUMENT MANAGEMENT (Downloadable PDFs / Reports)
# -------------------------------------------------------------
class DocumentRecord(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("idx_doc_event", "event_id"),
        Index("idx_doc_type", "doc_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)  # DOC-FLT-2026-0142
    event_id: Mapped[str] = mapped_column(String(80), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(80), nullable=False)  # Fault Detection Report, LSTM Analysis Report, etc.
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    filename: Mapped[str] = mapped_column(String(200), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(80), default="application/pdf")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    status: Mapped[str] = mapped_column(String(32), default="GENERATED")


# -------------------------------------------------------------
# 13. AUDIT LOGS
# -------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str | None] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(80))
    details: Mapped[str | None] = mapped_column(String(1000))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# -------------------------------------------------------------
# 14. COMPREHENSIVE RECOVERY EVENT INVESTIGATIONS (25 Detailed Scenarios)
# -------------------------------------------------------------
class RecoveryInvestigation(Base):
    __tablename__ = "recovery_investigations"
    __table_args__ = (
        Index("idx_inv_event_id", "event_id"),
        Index("idx_inv_subsystem", "subsystem"),
        Index("idx_inv_severity", "severity"),
        Index("idx_inv_outcome", "final_outcome"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)  # e.g. EVT-2026-0001
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    component_id: Mapped[str] = mapped_column(String(64), nullable=False)
    component_name: Mapped[str] = mapped_column(String(160), nullable=False)
    subsystem: Mapped[str] = mapped_column(String(64), nullable=False)
    fault_type: Mapped[str] = mapped_column(String(120), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    current_status: Mapped[str] = mapped_column(String(40), nullable=False)  # RESOLVED, CONTAINED, FAILED, SAFE_MODE, PENDING_EARTH
    final_outcome: Mapped[str] = mapped_column(String(80), nullable=False)

    # 12 Detailed Investigation Sections
    what_happened: Mapped[str] = mapped_column(Text, nullable=False)
    why_it_happened: Mapped[str] = mapped_column(Text, nullable=False)
    initial_telemetry: Mapped[list] = mapped_column(JSON, nullable=False)
    lstm_analysis: Mapped[dict] = mapped_column(JSON, nullable=False)
    ppo_decision: Mapped[dict] = mapped_column(JSON, nullable=False)
    replication_core_test: Mapped[dict] = mapped_column(JSON, nullable=False)
    computational_core_verification: Mapped[dict] = mapped_column(JSON, nullable=False)
    permanent_execution: Mapped[dict] = mapped_column(JSON, nullable=False)
    earth_communication: Mapped[dict] = mapped_column(JSON, nullable=False)
    final_result: Mapped[dict] = mapped_column(JSON, nullable=False)
    timeline: Mapped[list] = mapped_column(JSON, nullable=False)
