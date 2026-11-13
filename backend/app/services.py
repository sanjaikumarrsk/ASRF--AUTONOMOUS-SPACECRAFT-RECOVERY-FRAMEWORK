import math
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .errors import RequestConflictError, ResourceNotFoundError
from .models import (
    ApprovalStatus,
    CommandVerification,
    FaultDetection,
    FaultSeverity,
    FaultStatus,
    RecoveryOutcome,
    RecoveryStrategy,
    SpacecraftTelemetry,
)
from .schemas import (
    CommandVerificationRequest,
    CommandVerificationResponse,
    DashboardOverviewResponse,
    FaultPatchRequest,
    FaultRequest,
    FaultResponse,
    PageResponse,
    RecoveryOutcomeRequest,
    RecoveryOutcomeResponse,
    RecoveryStrategyRequest,
    RecoveryStrategyResponse,
    SubsystemSummary,
    TelemetryRequest,
    TelemetryResponse,
)


ACTIVE_FAULT_STATUSES = (FaultStatus.OPEN, FaultStatus.INVESTIGATING, FaultStatus.ACKNOWLEDGED)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def page_query(db: Session, statement, page: int, size: int, mapper) -> PageResponse:
    page = max(0, page)
    size = min(max(1, size), 100)
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    rows = db.scalars(statement.offset(page * size).limit(size)).all()
    total_pages = math.ceil(total / size) if total else 0
    return PageResponse(
        content=[mapper(row) for row in rows],
        totalElements=total,
        totalPages=total_pages,
        size=size,
        number=page,
        first=page == 0,
        last=page >= max(total_pages - 1, 0),
    )


def telemetry_response(item: SpacecraftTelemetry) -> TelemetryResponse:
    return TelemetryResponse(
        id=item.id,
        subsystemId=item.subsystem_id,
        processorTemperature=item.processor_temperature,
        powerDraw=item.power_draw,
        batteryLevel=item.battery_level,
        communicationDelay=item.communication_delay,
        processorLoad=item.processor_load,
        memoryUtilization=item.memory_utilization,
        storageUtilization=item.storage_utilization,
        timestamp=item.timestamp,
    )


def fault_response(item: FaultDetection) -> FaultResponse:
    return FaultResponse(
        id=item.id,
        subsystemId=item.subsystem_id,
        faultType=item.fault_type,
        severity=item.severity,
        description=item.description,
        detectionTimestamp=item.detection_timestamp,
        status=item.status,
        resolvedAt=item.resolved_at,
        resolutionNotes=item.resolution_notes,
        supportingTelemetry=telemetry_response(item.telemetry) if item.telemetry else None,
    )


def strategy_response(item: RecoveryStrategy) -> RecoveryStrategyResponse:
    return RecoveryStrategyResponse(
        id=item.id,
        faultId=item.fault_id,
        subsystemId=item.subsystem_id,
        name=item.name,
        description=item.description,
        policyRecommendation=item.policy_recommendation,
        decisionContext=item.decision_context,
        executionEligibility=item.execution_eligibility,
        approvalStatus=item.approval_status,
        approvedBy=item.approved_by,
        approvedTimestamp=item.approved_timestamp,
        createdTimestamp=item.created_timestamp,
    )


def verification_response(item: CommandVerification) -> CommandVerificationResponse:
    return CommandVerificationResponse(
        id=item.id,
        strategyId=item.strategy_id,
        commandId=item.command_id,
        proposedCommand=item.proposed_command,
        verificationMethod=item.verification_method,
        verificationStatus=item.verification_status,
        validationResult=item.validation_result,
        actor=item.actor,
        timestamp=item.timestamp,
    )


def outcome_response(item: RecoveryOutcome) -> RecoveryOutcomeResponse:
    return RecoveryOutcomeResponse(
        id=item.id,
        faultId=item.fault_id,
        strategyId=item.strategy_id,
        verificationId=item.verification_id,
        replicationResult=item.replication_result,
        recoveryOutcome=item.recovery_outcome,
        missionStatus=item.mission_status,
        executionStatus=item.execution_status,
        executionTimestamp=item.execution_timestamp,
        completionTimestamp=item.completion_timestamp,
        diagnosticExplanation=item.diagnostic_explanation,
    )


def _record_fault(db: Session, telemetry: SpacecraftTelemetry, fault_type: str, description: str, severity: FaultSeverity) -> None:
    exists = db.scalar(select(FaultDetection.id).where(
        FaultDetection.subsystem_id == telemetry.subsystem_id,
        FaultDetection.fault_type == fault_type,
        FaultDetection.status.in_(ACTIVE_FAULT_STATUSES),
    ).limit(1))
    if exists:
        return
    db.add(FaultDetection(
        subsystem_id=telemetry.subsystem_id,
        fault_type=fault_type,
        severity=severity,
        description=f"{description} This is a deterministic threshold finding; AI explanation is separate.",
        detection_timestamp=telemetry.timestamp,
        telemetry_id=telemetry.id,
        status=FaultStatus.OPEN,
    ))


def detect_faults(db: Session, telemetry: SpacecraftTelemetry) -> None:
    settings = get_settings()
    checks = [
        ("PROCESSOR_TEMPERATURE", telemetry.processor_temperature > settings.celestial_temp_max or telemetry.processor_temperature < settings.celestial_temp_min,
         f"Processor temperature {telemetry.processor_temperature} is outside the configured range.", FaultSeverity.HIGH if telemetry.processor_temperature > settings.celestial_temp_max else FaultSeverity.MEDIUM),
        ("POWER_DRAW", telemetry.power_draw > settings.celestial_power_max, f"Power draw {telemetry.power_draw} exceeds the configured maximum.", FaultSeverity.HIGH),
        ("LOW_BATTERY", telemetry.battery_level < settings.celestial_battery_min, f"Battery level {telemetry.battery_level} is below the configured minimum.", FaultSeverity.HIGH),
        ("COMMUNICATION_DELAY", telemetry.communication_delay > settings.celestial_comm_delay_max, f"Communication delay {telemetry.communication_delay} exceeds the configured maximum.", FaultSeverity.MEDIUM),
        ("PROCESSOR_LOAD", telemetry.processor_load > settings.celestial_cpu_load_max, f"Processor load {telemetry.processor_load} exceeds the configured maximum.", FaultSeverity.HIGH),
    ]
    for fault_type, triggered, description, severity in checks:
        if triggered:
            _record_fault(db, telemetry, fault_type, description, severity)

    history = db.scalars(select(SpacecraftTelemetry).where(
        SpacecraftTelemetry.subsystem_id == telemetry.subsystem_id,
    ).order_by(SpacecraftTelemetry.timestamp.desc()).limit(2)).all()
    if len(history) > 1:
        previous = history[1]
        trend_checks = [
            ("SUDDEN_TEMPERATURE_CHANGE", abs(telemetry.processor_temperature - previous.processor_temperature) > settings.celestial_sudden_temp_delta, "Processor temperature changed by more than the configured trend delta."),
            ("SUDDEN_POWER_CHANGE", abs(telemetry.power_draw - previous.power_draw) > settings.celestial_sudden_power_delta, "Power draw changed by more than the configured trend delta."),
            ("SUDDEN_PROCESSOR_LOAD_CHANGE", abs(telemetry.processor_load - previous.processor_load) > settings.celestial_sudden_load_delta, "Processor load changed by more than the configured trend delta."),
        ]
        for fault_type, triggered, description in trend_checks:
            if triggered:
                _record_fault(db, telemetry, fault_type, description, FaultSeverity.MEDIUM)


def detect_stale_telemetry(db: Session) -> None:
    settings = get_settings()
    readings = db.scalars(select(SpacecraftTelemetry).order_by(SpacecraftTelemetry.timestamp.desc()).limit(100)).all()
    latest: dict[str, SpacecraftTelemetry] = {}
    for reading in readings:
        latest.setdefault(reading.subsystem_id, reading)
    cutoff = utc_now() - timedelta(minutes=settings.celestial_stale_minutes)
    for reading in latest.values():
        if reading.timestamp < cutoff:
            _record_fault(db, reading, "STALE_TELEMETRY", "No fresh telemetry has arrived within the configured stale interval.", FaultSeverity.HIGH)


def search_telemetry(db: Session, subsystem_id: str | None, from_time: datetime | None, to_time: datetime | None, page: int, size: int) -> PageResponse:
    statement = select(SpacecraftTelemetry).order_by(SpacecraftTelemetry.timestamp.desc(), SpacecraftTelemetry.id.desc())
    if subsystem_id:
        statement = statement.where(SpacecraftTelemetry.subsystem_id == subsystem_id.strip().upper())
    if from_time:
        statement = statement.where(SpacecraftTelemetry.timestamp >= from_time)
    if to_time:
        statement = statement.where(SpacecraftTelemetry.timestamp <= to_time)
    return page_query(db, statement, page, size, telemetry_response)


def latest_telemetry(db: Session) -> list[TelemetryResponse]:
    readings = db.scalars(select(SpacecraftTelemetry).order_by(SpacecraftTelemetry.timestamp.desc()).limit(100)).all()
    latest: dict[str, SpacecraftTelemetry] = {}
    for reading in readings:
        latest.setdefault(reading.subsystem_id, reading)
    return [telemetry_response(item) for item in latest.values()]


def ingest_telemetry(db: Session, request: TelemetryRequest) -> TelemetryResponse:
    item = SpacecraftTelemetry(
        subsystem_id=request.subsystemId.strip().upper(),
        processor_temperature=request.processorTemperature,
        power_draw=request.powerDraw,
        battery_level=request.batteryLevel,
        communication_delay=request.communicationDelay,
        processor_load=request.processorLoad,
        memory_utilization=request.memoryUtilization,
        storage_utilization=request.storageUtilization,
        timestamp=request.timestamp or utc_now(),
    )
    db.add(item)
    db.flush()
    detect_faults(db, item)
    db.commit()
    db.refresh(item)
    return telemetry_response(item)


def get_or_404(db: Session, model, item_id: uuid.UUID, label: str):
    item = db.get(model, item_id)
    if not item:
        raise ResourceNotFoundError(f"{label} not found: {item_id}")
    return item


def search_faults(db: Session, subsystem_id: str | None, fault_type: str | None, severity: FaultSeverity | None, status: FaultStatus | None, from_time: datetime | None, to_time: datetime | None, page: int, size: int) -> PageResponse:
    statement = select(FaultDetection).order_by(FaultDetection.detection_timestamp.desc(), FaultDetection.id.desc())
    if subsystem_id:
        statement = statement.where(FaultDetection.subsystem_id == subsystem_id.strip().upper())
    if fault_type:
        statement = statement.where(FaultDetection.fault_type == fault_type.strip().upper())
    if severity:
        statement = statement.where(FaultDetection.severity == severity)
    if status:
        statement = statement.where(FaultDetection.status == status)
    if from_time:
        statement = statement.where(FaultDetection.detection_timestamp >= from_time)
    if to_time:
        statement = statement.where(FaultDetection.detection_timestamp <= to_time)
    return page_query(db, statement, page, size, fault_response)


def create_fault(db: Session, request: FaultRequest) -> FaultResponse:
    telemetry = get_or_404(db, SpacecraftTelemetry, request.telemetryId, "Telemetry record") if request.telemetryId else None
    item = FaultDetection(
        subsystem_id=request.subsystemId.strip().upper(),
        fault_type=request.faultType.strip().upper(),
        severity=request.severity,
        description=request.description,
        detection_timestamp=utc_now(),
        telemetry=telemetry,
        status=FaultStatus.OPEN,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return fault_response(item)


def patch_fault(db: Session, item_id: uuid.UUID, request: FaultPatchRequest) -> FaultResponse:
    item = get_or_404(db, FaultDetection, item_id, "Fault")
    if request.status is not None:
        item.status = request.status
        if request.status == FaultStatus.RESOLVED:
            item.resolved_at = utc_now()
    if request.resolutionNotes is not None:
        item.resolution_notes = request.resolutionNotes
    db.commit()
    db.refresh(item)
    return fault_response(item)


def search_strategies(db: Session, subsystem_id: str | None, status: ApprovalStatus | None, page: int, size: int) -> PageResponse:
    statement = select(RecoveryStrategy).order_by(RecoveryStrategy.created_timestamp.desc(), RecoveryStrategy.id.desc())
    if subsystem_id:
        statement = statement.where(RecoveryStrategy.subsystem_id == subsystem_id.strip().upper())
    if status:
        statement = statement.where(RecoveryStrategy.approval_status == status)
    return page_query(db, statement, page, size, strategy_response)


def create_strategy(db: Session, request: RecoveryStrategyRequest) -> RecoveryStrategyResponse:
    fault = get_or_404(db, FaultDetection, request.faultId, "Fault") if request.faultId else None
    item = RecoveryStrategy(
        fault_id=fault.id if fault else None,
        subsystem_id=request.subsystemId.strip().upper(),
        name=request.name,
        description=request.description,
        policy_recommendation=request.policyRecommendation,
        decision_context=request.decisionContext,
        execution_eligibility="PROPOSAL_ONLY",
        approval_status=ApprovalStatus.PROPOSED,
        created_timestamp=utc_now(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return strategy_response(item)


def approve_strategy(db: Session, item_id: uuid.UUID, actor: str) -> RecoveryStrategyResponse:
    if not actor.strip():
        raise RequestConflictError("An approving actor is required.")
    item = get_or_404(db, RecoveryStrategy, item_id, "Recovery strategy")
    if item.approval_status == ApprovalStatus.REJECTED:
        raise RequestConflictError("A rejected strategy cannot be approved.")
    item.approval_status = ApprovalStatus.APPROVED
    item.approved_by = actor.strip()
    item.approved_timestamp = utc_now()
    item.execution_eligibility = "APPROVED_FOR_VERIFICATION_ONLY"
    db.commit()
    db.refresh(item)
    return strategy_response(item)


def search_verifications(db: Session, status: str | None, strategy_id: uuid.UUID | None, page: int, size: int) -> PageResponse:
    statement = select(CommandVerification).order_by(CommandVerification.timestamp.desc(), CommandVerification.id.desc())
    if status:
        statement = statement.where(func.upper(CommandVerification.verification_status) == status.upper())
    if strategy_id:
        statement = statement.where(CommandVerification.strategy_id == strategy_id)
    return page_query(db, statement, page, size, verification_response)


def create_verification(db: Session, request: CommandVerificationRequest) -> CommandVerificationResponse:
    strategy = get_or_404(db, RecoveryStrategy, request.strategyId, "Recovery strategy") if request.strategyId else None
    if strategy and strategy.approval_status != ApprovalStatus.APPROVED:
        raise RequestConflictError("A strategy must be approved before its command can be verified.")
    item = CommandVerification(
        strategy_id=strategy.id if strategy else None,
        command_id=request.commandId,
        proposed_command=request.proposedCommand,
        verification_method=request.verificationMethod,
        verification_status=request.verificationStatus.strip().upper(),
        validation_result=request.validationResult,
        actor=request.actor,
        timestamp=utc_now(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return verification_response(item)


def search_outcomes(db: Session, mission_status: str | None, execution_status: str | None, page: int, size: int) -> PageResponse:
    statement = select(RecoveryOutcome).order_by(RecoveryOutcome.execution_timestamp.desc(), RecoveryOutcome.id.desc())
    if mission_status:
        statement = statement.where(func.upper(RecoveryOutcome.mission_status) == mission_status.upper())
    if execution_status:
        statement = statement.where(func.upper(RecoveryOutcome.execution_status) == execution_status.upper())
    return page_query(db, statement, page, size, outcome_response)


def create_outcome(db: Session, request: RecoveryOutcomeRequest) -> RecoveryOutcomeResponse:
    fault = get_or_404(db, FaultDetection, request.faultId, "Fault") if request.faultId else None
    strategy = get_or_404(db, RecoveryStrategy, request.strategyId, "Recovery strategy") if request.strategyId else None
    verification = get_or_404(db, CommandVerification, request.verificationId, "Command verification") if request.verificationId else None
    claims_execution = request.executionStatus.upper() == "EXECUTED" or request.recoveryOutcome.upper() == "SUCCESS"
    if claims_execution:
        if not verification or verification.verification_status.upper() != "PASSED":
            raise RequestConflictError("Successful or executed outcomes require a trusted PASSED command verification.")
        if strategy and strategy.approval_status != ApprovalStatus.APPROVED:
            raise RequestConflictError("Successful or executed outcomes require an approved strategy.")
    item = RecoveryOutcome(
        fault_id=fault.id if fault else None,
        strategy_id=strategy.id if strategy else None,
        verification_id=verification.id if verification else None,
        replication_result=request.replicationResult,
        recovery_outcome=request.recoveryOutcome,
        mission_status=request.missionStatus,
        execution_status=request.executionStatus,
        execution_timestamp=request.executionTimestamp,
        completion_timestamp=request.completionTimestamp,
        diagnostic_explanation=request.diagnosticExplanation,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return outcome_response(item)


def subsystem_summary(db: Session, telemetry: SpacecraftTelemetry) -> SubsystemSummary:
    settings = get_settings()
    score = 100.0
    if telemetry.processor_temperature > settings.celestial_temp_max or telemetry.processor_temperature < settings.celestial_temp_min:
        score -= 25
    if telemetry.power_draw > settings.celestial_power_max:
        score -= 20
    if telemetry.battery_level < settings.celestial_battery_min:
        score -= 20
    if telemetry.communication_delay > settings.celestial_comm_delay_max:
        score -= 15
    if telemetry.processor_load > settings.celestial_cpu_load_max:
        score -= 20
    stale = telemetry.timestamp < utc_now() - timedelta(minutes=settings.celestial_stale_minutes)
    score = 0.0 if stale else max(0.0, min(100.0, score))
    status = "STALE" if stale else "HEALTHY" if score >= 85 else "WARNING" if score >= 70 else "DEGRADED"
    signals = db.scalar(select(func.count(SpacecraftTelemetry.id)).where(SpacecraftTelemetry.subsystem_id == telemetry.subsystem_id)) or 0
    return SubsystemSummary(subsystemId=telemetry.subsystem_id, health=score, status=status, trend="STABLE", signals=signals, lastUpdate=telemetry.timestamp)


def dashboard_overview(db: Session) -> DashboardOverviewResponse:
    latest_models = db.scalars(select(SpacecraftTelemetry).order_by(SpacecraftTelemetry.timestamp.desc()).limit(100)).all()
    latest: dict[str, SpacecraftTelemetry] = {}
    for item in latest_models:
        latest.setdefault(item.subsystem_id, item)
    recent = db.scalars(select(FaultDetection).order_by(FaultDetection.detection_timestamp.desc()).limit(10)).all()
    telemetry_count = db.scalar(select(func.count(SpacecraftTelemetry.id))) or 0
    active_faults = db.scalar(select(func.count(FaultDetection.id)).where(FaultDetection.status.in_(ACTIVE_FAULT_STATUSES))) or 0
    summaries = [subsystem_summary(db, item) for item in latest.values()]
    average = sum(item.health for item in summaries) / len(summaries) if summaries else 0
    unresolved = any(item.status != FaultStatus.RESOLVED for item in recent)
    critical = any(item.status != FaultStatus.RESOLVED and item.severity == FaultSeverity.CRITICAL for item in recent)
    stale = any(item.status == "STALE" for item in summaries)
    if not summaries:
        mission_status = "NO_DATA"
    elif critical or average < 50:
        mission_status = "CRITICAL"
    elif stale or average < 70 or unresolved:
        mission_status = "DEGRADED"
    elif average < 85:
        mission_status = "CAUTION"
    else:
        mission_status = "NOMINAL"
    return DashboardOverviewResponse(
        missionStatus=mission_status,
        hasData=bool(latest_models),
        telemetryCount=telemetry_count,
        activeFaultCount=active_faults,
        aiAvailable=get_settings().ai_available,
        generatedAt=utc_now(),
        latestTelemetry=[telemetry_response(item) for item in latest.values()],
        subsystems=summaries,
        recentFaults=[fault_response(item) for item in recent],
    )
