"""
CELESTIAL-X Database Seeder
Seeds 50+ spacecraft components, telemetry history, full recovery event lifecycles,
and generates real persistent downloadable technical documents on disk.
"""

from datetime import datetime, timedelta, timezone
import os
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .auth import hash_password
from .components_data import SPACECRAFT_COMPONENTS
from .document_generator import generate_document_content
from .investigations_data import INVESTIGATION_RECORDS
from .models import (
    AiAnalysisRecord,
    AuditLog,
    CommandVerification,
    CommunicationMessage,
    ComponentHealthHistory,
    ComponentTelemetryReading,
    DocumentRecord,
    EarthValidationDecision,
    EarthValidationRequest,
    FaultDetection,
    FaultSeverity,
    FaultStatus,
    MissionEvent,
    PpoDecisionRecord,
    RecoveryInvestigation,
    RecoveryOutcome,
    RecoveryStrategy,
    ReplicationTestRecord,
    RollbackRecord,
    SpacecraftComponent,
    User,
    utc_now,
)

DOCUMENTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage", "documents"))


def seed_database(db: Session) -> dict:
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    summary = {}

    # 1. Seed Default Users
    existing_user_count = db.scalar(select(func.count(User.id))) or 0
    if existing_user_count == 0:
        default_users = [
            User(
                name="Flight Operations Lead",
                email="rsk@celestial-x.nasa.gov",
                username="rsk",
                password_hash=hash_password("rsk"),
                role="ADMIN",
                is_active=True,
                created_at=utc_now(),
                last_login=utc_now(),
            ),
            User(
                name="Mission Scientist",
                email="scientist@celestial-x.nasa.gov",
                username="scientist",
                password_hash=hash_password("scientist123"),
                role="SCIENTIST",
                is_active=True,
                created_at=utc_now(),
                last_login=utc_now(),
            ),
            User(
                name="Flight Operator",
                email="operator@celestial-x.nasa.gov",
                username="operator",
                password_hash=hash_password("operator123"),
                role="OPERATOR",
                is_active=True,
                created_at=utc_now(),
                last_login=utc_now(),
            ),
        ]
        db.add_all(default_users)
        db.commit()
    summary["users"] = db.scalar(select(func.count(User.id)))

    # 2. Seed 50+ Spacecraft Components
    existing_comp_count = db.scalar(select(func.count(SpacecraftComponent.id))) or 0
    if existing_comp_count < len(SPACECRAFT_COMPONENTS):
        now = utc_now()
        for c_data in SPACECRAFT_COMPONENTS:
            existing = db.get(SpacecraftComponent, c_data["id"])
            if not existing:
                comp = SpacecraftComponent(
                    id=c_data["id"],
                    name=c_data["name"],
                    subsystem=c_data["subsystem"],
                    description=c_data["description"],
                    operating_purpose=c_data["operating_purpose"],
                    sensor_type=c_data["sensor_type"],
                    operating_unit=c_data["operating_unit"],
                    normal_range_min=c_data["normal_range_min"],
                    normal_range_max=c_data["normal_range_max"],
                    warning_threshold=c_data["warning_threshold"],
                    critical_threshold=c_data["critical_threshold"],
                    current_value=c_data["current_value"],
                    health_percentage=c_data["health_percentage"],
                    current_status=c_data["current_status"],
                    fault_status=c_data["fault_status"],
                    last_updated=now,
                )
                db.add(comp)

                # Seed initial 20 historical readings for each component
                for i in range(20):
                    reading_time = now - timedelta(minutes=(19 - i) * 2)
                    delta = (i % 5 - 2) * 0.2
                    reading = ComponentTelemetryReading(
                        component_id=c_data["id"],
                        timestamp=reading_time,
                        sensor_name=c_data["sensor_type"],
                        value=round(c_data["current_value"] + delta, 2),
                        unit=c_data["operating_unit"],
                        status="NOMINAL",
                    )
                    db.add(reading)

                    health_record = ComponentHealthHistory(
                        component_id=c_data["id"],
                        timestamp=reading_time,
                        health_percentage=round(c_data["health_percentage"] + delta * 0.5, 1),
                        status=c_data["current_status"],
                        anomaly_score=round(0.05 + abs(delta) * 0.02, 3),
                    )
                    db.add(health_record)
        db.commit()
    summary["components"] = db.scalar(select(func.count(SpacecraftComponent.id)))

    # 3. Seed Complete Lifecycle Event EVT-PRC-0042
    event_id = "EVT-PRC-0042"
    existing_event = db.scalar(select(MissionEvent).where(MissionEvent.event_id == event_id))
    if not existing_event:
        now = utc_now() - timedelta(minutes=45)

        # Timeline stages
        timeline_items = [
            ("T+00:00", "TELEMETRY_ANOMALY", "Telemetry anomaly detected", "CPU junction temperature sensor reported 82.7°C, exceeding warning threshold 78.0°C under load spike.", "HIGH", "flight_computer", "CMP-FC-003"),
            ("T+00:02", "DATA_PROCESSING", "Spark + Scala processing completed", "Streaming ingestion pipeline normalized 18,420 records/sec across 24 partitions with 142ms latency.", "NOMINAL", "flight_computer", "CMP-FC-001"),
            ("T+00:04", "LSTM_ANALYSIS", "LSTM identifies processor instability", "Temporal model evaluated 30-step window; anomaly score 0.87, fault probability 0.91, thermal-load runaway confirmed.", "HIGH", "flight_computer", "CMP-FC-001"),
            ("T+00:06", "SEVERITY_CLASSIFICATION", "Fault classified as HIGH", "Critical thermal margin diminished to 4.0°C; escalated to autonomous recovery policy engine.", "HIGH", "flight_computer", "CMP-FC-001"),
            ("T+00:08", "PPO_DECISION", "PPO selects PROCESSOR_RESTART", "Reinforcement learning agent evaluated 7 candidate actions; selected PROCESSOR_RESTART with 92.6% confidence.", "HIGH", "flight_computer", "CMP-FC-001"),
            ("T+00:10", "REPLICATION_START", "Replication Core begins test", "Synchronized replica state initialized across Power, Thermal, and Compute model circuit.", "ACTIVE", "flight_computer", "CMP-FC-001"),
            ("T+00:13", "REPLICATION_COMPLETE", "Replication result successful", "3.0s simulated run completed: thermal response STABLE, power ACCEPTABLE, mission continuity PRESERVED.", "SUCCESS", "flight_computer", "CMP-FC-001"),
            ("T+00:15", "COMPUTATIONAL_VERIFICATION", "Computational Core verification passed", "Validity check, safety envelope, and Golden Library verification verified with zero constraint violations.", "VERIFIED", "flight_computer", "CMP-FC-001"),
            ("T+00:16", "ROLLBACK_CHECK", "Rollback verified and active", "Rollback snapshot RB-PRC-042 prepared; reversal path guaranteed within 8.4s recovery window.", "STANDBY", "flight_computer", "CMP-FC-001"),
            ("T+00:17", "EARTH_VALIDATION", "Ground validation confirmed", "X-Band validation exchange with JPL Flight Director; command execution token confirmed.", "AUTHORIZED", "flight_computer", "CMP-FC-001"),
            ("T+00:19", "RECOVERY_EXECUTION", "Recovery command executed", "Safe restart sequence initiated; watchdogs held; secondary processor maintained shadow state.", "SUCCESS", "flight_computer", "CMP-FC-001"),
            ("T+00:21", "RECOVERY_CONFIRMATION", "Recovery confirmed on bus", "Processor temperature normalized to 64.1°C; CPU load stabilized at 41.2%; telemetry nominal.", "SUCCESS", "flight_computer", "CMP-FC-001"),
            ("T+00:22", "MISSION_CONTINUITY", "Mission continuity preserved", "All science telemetry queues resumed; zero memory corruption; autonomous recovery closed.", "NOMINAL", "flight_computer", "CMP-FC-001"),
        ]

        for offset, stage, title, desc, status, subsys, c_id in timeline_items:
            db.add(MissionEvent(
                event_id=event_id,
                timeline_offset=offset,
                stage=stage,
                title=title,
                description=desc,
                status=status,
                subsystem=subsys,
                component_id=c_id,
                timestamp=now + timedelta(seconds=int(offset.replace("T+", "").replace("00:", "")) * 6),
            ))

        # Fault record
        fault = FaultDetection(
            event_id=event_id,
            component_id="CMP-FC-001",
            subsystem_id="flight_computer",
            fault_type="PROCESSOR_THERMAL_LOAD_RUNAWAY",
            severity=FaultSeverity.HIGH,
            description="Main Flight Computer thermal dissipation spike to 82.7°C combined with 91% processor load.",
            detection_timestamp=now,
            status=FaultStatus.RESOLVED,
            anomaly_score=0.87,
            root_cause_hypothesis="Task queue scheduling deadlock inducing elevated CPU power dissipation.",
            confidence=94.2,
            resolved_at=now + timedelta(minutes=2),
            resolution_notes="Autonomous recovery via PROCESSOR_RESTART verified and confirmed.",
        )
        db.add(fault)

        # AI record
        db.add(AiAnalysisRecord(
            event_id=event_id,
            component_id="CMP-FC-001",
            model_name="LSTM Fault Analyzer",
            sequence_length=30,
            anomaly_score=0.87,
            fault_probability=0.91,
            root_cause_confidence=88.4,
            detected_pattern="Processor thermal-load runaway instability",
            features_count=24,
            input_samples=60,
            timestamp=now + timedelta(seconds=24),
        ))

        # PPO record
        db.add(PpoDecisionRecord(
            decision_id="PPO-2026-0087",
            event_id=event_id,
            component_id="CMP-FC-001",
            subsystem_id="flight_computer",
            state_vector={"health": 0.64, "power_margin": 0.18, "thermal_margin": 0.08, "comm": 0.94, "fault_class": "THERMAL_LOAD"},
            candidate_actions=["NO_ACTION", "PROCESSOR_RESTART", "POWER_RECONFIG", "THERMAL_ADJUST", "COMM_RECONFIG", "SAFE_MODE", "SUBSYSTEM_RESET"],
            selected_action="PROCESSOR_RESTART",
            action_parameters="Timeout: 12s, Mode: Safe Warm Reset",
            policy_confidence=92.6,
            expected_reward=0.94,
            actual_reward=0.91,
            decision_mode="PPO_REINFORCEMENT_LEARNING",
            model_version="ppo-spacecraft-v2.1",
            timestamp=now + timedelta(seconds=48),
        ))

        # Replication Test
        db.add(ReplicationTestRecord(
            test_id="REP-2026-0841",
            event_id=event_id,
            component_id="CMP-FC-001",
            candidate_action="PROCESSOR_RESTART",
            initial_replica_state={"cpu_temp": 82.7, "cpu_load": 91.0, "power_w": 109.8, "status": "DEGRADED"},
            duration_seconds=3.0,
            thermal_response="STABLE",
            power_response="ACCEPTABLE",
            cpu_response="NOMINAL",
            comm_response="NOMINAL",
            subsystem_recovery="SUCCESS",
            mission_continuity="PRESERVED",
            outcome_confidence=93.7,
            risk="LOW",
            recommendation="PROCEED TO COMPUTATIONAL CORE",
            pass_fail="PASS",
            timestamp=now + timedelta(seconds=78),
        ))

        # Computational Core Verification
        db.add(CommandVerification(
            event_id=event_id,
            command_id="CMD-PRC-042",
            target_subsystem="Flight Computer",
            command_name="PROCESSOR_RESTART",
            proposed_command="EXECUTE_PROCESSOR_RESTART --target=FC_MOD_A --timeout=12",
            parameters="Timeout: 12s, GracefulSync: True",
            validity="VALID",
            safety_check="PASSED",
            verified_library="VERIFIED",
            rollback_status="AVAILABLE",
            rollback_plan_id="RB-PRC-042",
            consistency_check="PASSED",
            authorization_status="AUTHORIZED",
            verification_method="SAFETY_ENVELOPE_AND_ROLLBACK_AUDIT",
            verification_status="PASSED",
            validation_result="All pre-execution safety bounds satisfied. Command authorized for execution.",
            actor="COMPUTATIONAL_CORE",
            timestamp=now + timedelta(seconds=90),
        ))

        # Rollback record
        db.add(RollbackRecord(
            rollback_id="RB-PRC-042",
            event_id=event_id,
            command_id="CMD-PRC-042",
            reversal_path="Processor Restart -> Previous Known Operating State",
            estimated_recovery_seconds=8.4,
            verification_status="PASSED",
            execution_status="STANDBY",
            timestamp=now + timedelta(seconds=96),
        ))

        # Earth Validation Request & Decision
        db.add(EarthValidationRequest(
            request_id="VAL-REQ-2026-0198",
            event_id=event_id,
            component_id="CMP-FC-001",
            fault_details="High severity thermal runaway on Main FC; PPO selected PROCESSOR_RESTART; Replication Core PASSED.",
            proposed_command="CMD-PRC-042 (PROCESSOR_RESTART)",
            safety_analysis="Rollback RB-PRC-042 active; zero risk of permanent bus latching.",
            transmission_delay_seconds=12.8,
            status="CONFIRMED",
            sent_timestamp=now + timedelta(seconds=102),
        ))

        db.add(EarthValidationDecision(
            decision_id="DEC-EARTH-0198",
            request_id="VAL-REQ-2026-0198",
            event_id=event_id,
            decision_maker="JPL FLIGHT DIRECTOR",
            decision_status="ACCEPTED",
            approval_reason="Replication Core test confidence 93.7% confirmed. Proceed with timed restart.",
            approved_command="CMD-PRC-042",
            conditions="Log post-restart thermal gradient for 120 seconds.",
            received_timestamp=now + timedelta(seconds=114),
        ))

        # Communication messages
        db.add(CommunicationMessage(
            message_id="MSG-M2E-0042",
            event_id=event_id,
            direction="MARS_TO_EARTH",
            content="[TELEMETRY DISPATCH] Anomaly EVT-PRC-0042. Replication test REP-2026-0841 PASSED. Request ground authorization for CMD-PRC-042.",
            transmission_delay_seconds=12.8,
            status="DELIVERED",
            timestamp=now + timedelta(seconds=102),
        ))

        db.add(CommunicationMessage(
            message_id="MSG-E2M-0042",
            event_id=event_id,
            direction="EARTH_TO_MARS",
            content="[MISSION CONTROL UPLINK] Decision DEC-EARTH-0198 ACCEPTED. CMD-PRC-042 authorized for execution. Maintain high-rate telemetry.",
            transmission_delay_seconds=12.8,
            status="DELIVERED",
            timestamp=now + timedelta(seconds=114),
        ))

        db.commit()

        # 4. Generate all 14 Required Documents on Disk and record in PostgreSQL
        document_types = [
            "Fault Detection Report",
            "LSTM Analysis Report",
            "PPO Recovery Proposal",
            "Replication Core Test Report",
            "Computational Core Verification Report",
            "Safety Verification Report",
            "Rollback Feasibility Report",
            "Earth Validation Request",
            "Earth Decision Report",
            "Approved Command Document",
            "Rejected Command Report",
            "Recovery Execution Report",
            "Mission Continuity Report",
            "Complete Event Summary",
        ]

        event_context = {
            "event_id": event_id,
            "component_id": "CMP-FC-001",
            "component_name": "Main Flight Computer",
            "subsystem": "Flight Computer",
            "timestamp": now.isoformat(),
        }

        for doc_type in document_types:
            clean_type = doc_type.lower().replace(" ", "_")
            doc_id = f"DOC-{event_id.replace('EVT-', '')}-{clean_type[:10].upper()}"
            filename = f"{doc_id}_{clean_type}.pdf"
            file_path = os.path.join(DOCUMENTS_DIR, filename)

            _, pdf_bytes = generate_document_content(doc_type, event_context)
            with open(file_path, "wb") as f:
                f.write(pdf_bytes)

            db.add(DocumentRecord(
                document_id=doc_id,
                event_id=event_id,
                doc_type=doc_type,
                title=f"{doc_type} - {event_id}",
                filename=filename,
                file_path=file_path,
                file_size_bytes=len(pdf_bytes),
                mime_type="application/pdf",
                generated_at=now + timedelta(minutes=3),
                status="AVAILABLE",
            ))
        db.commit()

    # 4. Seed 25 Comprehensive Recovery Event Investigations
    existing_inv_count = db.scalar(select(func.count(RecoveryInvestigation.id))) or 0
    if existing_inv_count < len(INVESTIGATION_RECORDS):
        for rec in INVESTIGATION_RECORDS:
            existing = db.scalar(select(RecoveryInvestigation).where(RecoveryInvestigation.event_id == rec["event_id"]))
            if not existing:
                try:
                    ts = datetime.fromisoformat(rec["timestamp"])
                except Exception:
                    ts = now
                db.add(RecoveryInvestigation(
                    event_id=rec["event_id"],
                    timestamp=ts,
                    component_id=rec["component_id"],
                    component_name=rec["component_name"],
                    subsystem=rec["subsystem"],
                    fault_type=rec["fault_type"],
                    severity=rec["severity"],
                    current_status=rec["current_status"],
                    final_outcome=rec["final_outcome"],
                    what_happened=rec["what_happened"],
                    why_it_happened=rec["why_it_happened"],
                    initial_telemetry=rec["initial_telemetry"],
                    lstm_analysis=rec["lstm_analysis"],
                    ppo_decision=rec["ppo_decision"],
                    replication_core_test=rec["replication_core_test"],
                    computational_core_verification=rec["computational_core_verification"],
                    permanent_execution=rec["permanent_execution"],
                    earth_communication=rec["earth_communication"],
                    final_result=rec["final_result"],
                    timeline=rec["timeline"],
                ))
        db.commit()

    summary["documents"] = db.scalar(select(func.count(DocumentRecord.id)))
    summary["timeline_events"] = db.scalar(select(func.count(MissionEvent.id)))
    summary["investigations"] = db.scalar(select(func.count(RecoveryInvestigation.id)))
    return summary


if __name__ == "__main__":
    from .database import SessionLocal
    with SessionLocal() as session:
        result = seed_database(session)
        print("Database seeded successfully:", result)

