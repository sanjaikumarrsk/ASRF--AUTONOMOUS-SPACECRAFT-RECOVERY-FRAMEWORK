import asyncio
import math
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from .config import get_settings
from .database import SessionLocal
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
from .services import detect_faults, utc_now


DEMO_SUBSYSTEMS = ("POWER_CORE", "THERMAL_LOOP", "COMM_ARRAY", "NAV_COMPUTE")


def _telemetry_values(subsystem: str, tick: int) -> dict[str, float]:
    phase = tick / 3.0 + DEMO_SUBSYSTEMS.index(subsystem)
    values = {
        "processor_temperature": 42 + 5 * math.sin(phase),
        "power_draw": 98 + 14 * math.sin(phase * 0.7),
        "battery_level": 78 + 8 * math.sin(phase * 0.25),
        "communication_delay": 8 + 4 * math.sin(phase * 0.9),
        "processor_load": 54 + 15 * math.sin(phase * 0.8),
        "memory_utilization": 48 + 12 * math.sin(phase * 0.45),
        "storage_utilization": 36 + 8 * math.sin(phase * 0.3),
    }
    if subsystem == "THERMAL_LOOP" and tick % 12 == 0:
        values["processor_temperature"] = 94
    if subsystem == "POWER_CORE" and tick % 15 == 0:
        values["power_draw"] = 148
    if subsystem == "COMM_ARRAY" and tick % 17 == 0:
        values["communication_delay"] = 46
    if subsystem == "NAV_COMPUTE" and tick % 20 == 0:
        values["processor_load"] = 96
    return values


def _telemetry(subsystem: str, timestamp, tick: int) -> SpacecraftTelemetry:
    values = _telemetry_values(subsystem, tick)
    return SpacecraftTelemetry(subsystem_id=subsystem, timestamp=timestamp, **values)


def seed_demo_data(db) -> bool:
    existing = db.scalar(select(func.count(SpacecraftTelemetry.id))) or 0
    if existing:
        return False

    now = utc_now()
    history: dict[str, list[SpacecraftTelemetry]] = {subsystem: [] for subsystem in DEMO_SUBSYSTEMS}
    for tick in range(12):
        timestamp = now - timedelta(minutes=(11 - tick) * 2)
        for subsystem in DEMO_SUBSYSTEMS:
            reading = _telemetry(subsystem, timestamp, tick + 1)
            history[subsystem].append(reading)
            db.add(reading)
    db.flush()

    thermal_reading = history["THERMAL_LOOP"][-1]
    power_reading = history["POWER_CORE"][-1]
    thermal_reading.processor_temperature = 94
    power_reading.power_draw = 148

    thermal_fault = FaultDetection(
        subsystem_id="THERMAL_LOOP",
        fault_type="PROCESSOR_TEMPERATURE",
        severity=FaultSeverity.HIGH,
        description="Processor temperature is above the configured safe operating range. Demo telemetry is active.",
        detection_timestamp=thermal_reading.timestamp,
        telemetry_id=thermal_reading.id,
        status=FaultStatus.OPEN,
    )
    power_fault = FaultDetection(
        subsystem_id="POWER_CORE",
        fault_type="POWER_DRAW",
        severity=FaultSeverity.MEDIUM,
        description="Power draw is elevated during the demo mission profile.",
        detection_timestamp=power_reading.timestamp,
        telemetry_id=power_reading.id,
        status=FaultStatus.INVESTIGATING,
    )
    db.add_all([thermal_fault, power_fault])
    db.flush()

    approved_strategy = RecoveryStrategy(
        fault_id=thermal_fault.id,
        subsystem_id="THERMAL_LOOP",
        name="Thermal Load Shedding",
        description="Reduce non-critical thermal loads and continue monitoring the thermal loop.",
        policy_recommendation="Prioritize thermal stability before increasing payload activity.",
        decision_context={"source": "demo-simulator", "confidence": 0.94, "mode": "proposal-only"},
        execution_eligibility="APPROVED_FOR_VERIFICATION_ONLY",
        approval_status=ApprovalStatus.APPROVED,
        approved_by="MISSION_CONTROL",
        approved_timestamp=now - timedelta(minutes=8),
        created_timestamp=now - timedelta(minutes=10),
    )
    proposed_strategy = RecoveryStrategy(
        fault_id=power_fault.id,
        subsystem_id="POWER_CORE",
        name="Power Budget Rebalance",
        description="Prepare a lower-load operating profile for operator review.",
        policy_recommendation="Keep the action as a proposal until command verification is complete.",
        decision_context={"source": "demo-simulator", "confidence": 0.81, "mode": "proposal-only"},
        execution_eligibility="PROPOSAL_ONLY",
        approval_status=ApprovalStatus.PROPOSED,
        created_timestamp=now - timedelta(minutes=5),
    )
    db.add_all([approved_strategy, proposed_strategy])
    db.flush()

    passed_verification = CommandVerification(
        strategy_id=approved_strategy.id,
        command_id="CMD-DEMO-THERMAL-001",
        proposed_command="SET_THERMAL_LOAD_PROFILE CONSERVATIVE",
        verification_method="RULE_AND_SCHEMA_CHECK",
        verification_status="PASSED",
        validation_result="Command structure and safety constraints passed verification.",
        actor="MISSION_CONTROL",
        timestamp=now - timedelta(minutes=6),
    )
    pending_verification = CommandVerification(
        strategy_id=proposed_strategy.id,
        command_id="CMD-DEMO-POWER-002",
        proposed_command="SET_POWER_PROFILE BALANCED",
        verification_method="RULE_AND_SCHEMA_CHECK",
        verification_status="PENDING",
        validation_result="Awaiting operator approval before verification can complete.",
        actor="OPS_CONSOLE",
        timestamp=now - timedelta(minutes=3),
    )
    db.add_all([passed_verification, pending_verification])
    db.flush()

    db.add_all([
        RecoveryOutcome(
            fault_id=thermal_fault.id,
            strategy_id=approved_strategy.id,
            verification_id=passed_verification.id,
            replication_result="Recovery plan replicated to the simulator sandbox.",
            recovery_outcome="SUCCESS",
            mission_status="NOMINAL",
            execution_status="EXECUTED",
            execution_timestamp=now - timedelta(minutes=4),
            completion_timestamp=now - timedelta(minutes=3),
            diagnostic_explanation="Demo outcome only; no spacecraft command was sent.",
        ),
        RecoveryOutcome(
            fault_id=power_fault.id,
            strategy_id=proposed_strategy.id,
            verification_id=pending_verification.id,
            replication_result="Plan available for review.",
            recovery_outcome="PROPOSED",
            mission_status="DEGRADED",
            execution_status="NOT_EXECUTED",
            diagnostic_explanation="Awaiting approval and trusted command verification.",
        ),
    ])
    db.commit()
    return True


async def demo_loop() -> None:
    settings = get_settings()
    tick = 0
    while True:
        await asyncio.sleep(max(2, settings.celestial_demo_interval_seconds))
        db = SessionLocal()
        try:
            timestamp = utc_now()
            for subsystem in DEMO_SUBSYSTEMS:
                reading = _telemetry(subsystem, timestamp, tick)
                db.add(reading)
                db.flush()
                detect_faults(db, reading)
            db.commit()
            tick += 1
        except SQLAlchemyError:
            db.rollback()
        finally:
            db.close()
