"""
AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK
Live Telemetry Simulation and Streaming Engine
Manages all 50 components across 8 subsystems, physics simulation ticks,
WebSocket broadcasting, fault injection, and autonomous recovery flows.
"""

import asyncio
from collections import deque
from datetime import datetime, timedelta, timezone
import json
import logging
import math
import random
from typing import Any, Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from .database import SessionLocal
from .models import (
    AuditLog,
    CommandVerification,
    ComponentTelemetryReading,
    ComponentHealthHistory,
    FaultDetection,
    FaultSeverity,
    FaultStatus,
    MissionEvent,
    PpoDecisionRecord,
    RecoveryOutcome,
    RecoveryStrategy,
    SpacecraftComponent,
    utc_now,
)
from .components_data import SPACECRAFT_COMPONENTS

logger = logging.getLogger("celestial_x.stream")


class TelemetryStreamManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.is_running: bool = True
        self.interval_seconds: float = 1.0
        self.tick_count: int = 0
        self.fault_active: bool = False
        self.active_fault_component: str | None = None
        self.active_event_id: str | None = "EVT-2026-0001"
        self._lock = asyncio.Lock()

        # In-memory fast state for 50 components
        self.components_state: Dict[str, Dict[str, Any]] = {}
        self.sparklines: Dict[str, List[float]] = {}
        self.recent_logs: List[Dict[str, Any]] = []

        # Authoritative rolling history for the 6 primary dashboard channels (60 points)
        self.telemetry_history: deque = deque(maxlen=120)

        self._init_components_state()
        self._init_telemetry_history()

    def _init_components_state(self):
        subsystem_titles = {
            "flight_computer": "Flight Computer",
            "power": "Power System",
            "thermal": "Thermal Control",
            "communication": "Communication System",
            "navigation": "Navigation System",
            "mobility": "Mobility System",
            "scientific_sensors": "Scientific Sensors",
            "sensors": "Scientific Sensors",
            "storage_data": "Storage and Data System",
            "storage": "Storage and Data System",
        }
        for comp in SPACECRAFT_COMPONENTS:
            cid = comp.get("id") or comp.get("component_id")
            raw_sub = comp.get("subsystem", "")
            sub_title = subsystem_titles.get(raw_sub.lower(), raw_sub.replace("_", " ").title())
            n_min = float(comp.get("normal_range_min") or comp.get("nominal_min", 0.0))
            n_max = float(comp.get("normal_range_max") or comp.get("nominal_max", 100.0))
            crit = float(comp.get("critical_threshold", n_max * 1.2))
            curr = float(comp.get("current_value", (n_min + n_max) / 2.0))
            unit = comp.get("operating_unit") or comp.get("unit", "")
            health = float(comp.get("health_percentage") or comp.get("health_score", 98.0))

            self.components_state[cid] = {
                "component_id": cid,
                "name": comp.get("name", cid),
                "subsystem": sub_title,
                "description": comp.get("description", ""),
                "operating_purpose": comp.get("operating_purpose", ""),
                "sensor_type": comp.get("sensor_type", "Telemetry Sensor"),
                "primary_metric": comp.get("sensor_type", "Sensor Metric"),
                "unit": unit,
                "nominal_min": n_min,
                "nominal_max": n_max,
                "critical_threshold": crit,
                "redundancy_type": comp.get("redundancy_type", "HOT_STANDBY"),
                "redundancy_status": comp.get("redundancy_status", "ACTIVE_MONITORING"),
                "current_value": round(curr, 2),
                "current_status": comp.get("current_status", "HEALTHY"),
                "health_score": round(health, 1),
                "last_updated": utc_now().isoformat(),
            }
            # Initial sparkline (15 points)
            variance = max(0.1, (n_max - n_min) * 0.05)
            nominal_mid = (n_min + n_max) / 2.0
            self.sparklines[cid] = [
                round(nominal_mid + math.sin(i * 0.4) * variance, 2)
                for i in range(15)
            ]

    def _init_telemetry_history(self):
        """Generates an initial 60-point rolling history simulating the past 5 minutes with realistic aerospace variations."""
        now = datetime.now(timezone.utc)
        for i in range(60):
            past_time = now - timedelta(seconds=(60 - i) * 2)
            time_str = past_time.strftime("%H:%M:%S")
            t = i * 0.12

            # Calibrated engineering units
            temp = round(48.5 + 4.2 * math.sin(t) + random.uniform(-0.4, 0.4), 2)
            cpu = round(42.0 + 8.5 * math.sin(t * 1.4 + 0.8) + random.uniform(-1.2, 1.2), 1)
            power = round(106.0 + 6.8 * math.sin(t * 0.9 + 1.5) + random.uniform(-1.0, 1.0), 1)
            battery = round(89.5 - 0.04 * i + 0.5 * math.sin(t * 0.4), 1)
            # Comm delay with realistic deep-space dispersion points
            jitter = 3.2 if (i % 14 == 0) else random.uniform(-0.3, 0.3)
            comm = round(6.4 + 0.8 * math.sin(t * 0.6) + jitter, 2)
            margin = round(+(85.0 - temp), 2)
            anomaly = round(max(0.01, min(0.12, 0.04 + 0.02 * math.sin(t))), 3)

            self.telemetry_history.append({
                "time": time_str,
                "timestamp": past_time.isoformat(),
                "processorTemperature": temp,
                "processorLoad": max(10.0, min(100.0, cpu)),
                "powerDraw": max(50.0, power),
                "batteryLevel": max(0.0, min(100.0, battery)),
                "communicationDelay": max(2.0, comm),
                "thermalMargin": margin,
                "anomalyScore": anomaly,
            })

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")
        # Send initial snapshot with full history immediately
        snapshot = self.get_full_snapshot()
        await websocket.send_text(json.dumps(snapshot))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    def set_running(self, running: bool):
        self.is_running = running
        logger.info(f"Simulation running state set to: {running}")

    def set_interval(self, seconds: float):
        self.interval_seconds = max(0.5, min(10.0, seconds))
        logger.info(f"Simulation interval set to: {self.interval_seconds}s")

    def trigger_fault(self, component_id: str = "CMP-FC-001", fault_type: str = "CORE_OVERHEAT"):
        """Triggers an active fault and persists a FaultDetection record in PostgreSQL."""
        if component_id in self.components_state:
            comp = self.components_state[component_id]
            comp["current_status"] = "FAULT_DETECTED"
            comp["health_score"] = 28.0
            comp["current_value"] = comp["critical_threshold"] + 11.4
            self.fault_active = True
            self.active_fault_component = component_id
            now_iso = utc_now().isoformat()

            self.recent_logs.insert(0, {
                "timestamp": now_iso,
                "level": "CRITICAL",
                "subsystem": comp["subsystem"],
                "message": f"FAULT INJECTION: {comp['name']} ({component_id}) exceeded critical limit {comp['critical_threshold']}{comp['unit']} (read: {comp['current_value']}{comp['unit']})"
            })
            if len(self.recent_logs) > 50:
                self.recent_logs.pop()

            # Persist in PostgreSQL database
            db = SessionLocal()
            try:
                fault_rec = FaultDetection(
                    subsystem_id=comp["subsystem"],
                    fault_type="PROCESSOR_CORE_OVERHEAT",
                    severity=FaultSeverity.CRITICAL,
                    confidence_score=0.984,
                    description=f"Core junction temperature on {comp['name']} spiked to {comp['current_value']}{comp['unit']}, crossing safety boundary.",
                    status=FaultStatus.DETECTED,
                    detection_timestamp=utc_now(),
                    supporting_telemetry={
                        "processorTemperature": comp["current_value"],
                        "processorLoad": 94.2,
                        "powerDraw": 136.4,
                        "batteryLevel": 91.2,
                    }
                )
                db.add(fault_rec)

                # Add Audit Log
                audit = AuditLog(
                    category="fault_injection",
                    event_id=self.active_event_id,
                    actor="SIMULATION_OPERATOR",
                    action="TRIGGER_FAULT",
                    result="DETECTED",
                    details=f"Injected {fault_type} on {component_id} ({comp['name']})"
                )
                db.add(audit)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error persisting fault in PostgreSQL: {e}")
            finally:
                db.close()

            return True
        return False

    def recover_fault(self, component_id: str | None = None):
        """Resolves fault and persists PPO recovery decision, command verification & outcome in PostgreSQL."""
        target = component_id or self.active_fault_component or "CMP-FC-001"
        if target in self.components_state:
            comp = self.components_state[target]
            nominal_mid = (comp["nominal_min"] + comp["nominal_max"]) / 2.0
            comp["current_status"] = "HEALTHY"
            comp["health_score"] = 98.4
            comp["current_value"] = round(nominal_mid, 2)
            self.fault_active = False
            self.active_fault_component = None
            now_iso = utc_now().isoformat()

            self.recent_logs.insert(0, {
                "timestamp": now_iso,
                "level": "INFO",
                "subsystem": comp["subsystem"],
                "message": f"AUTONOMOUS RECOVERY COMPLETE: {comp['name']} restored to nominal envelope ({comp['current_value']}{comp['unit']})"
            })

            # Persist PPO Decision, Verification, and Outcome in PostgreSQL
            db = SessionLocal()
            try:
                # 1. Update latest fault to RESOLVED
                latest_fault = db.scalars(select(FaultDetection).order_by(FaultDetection.detection_timestamp.desc()).limit(1)).first()
                if latest_fault:
                    latest_fault.status = FaultStatus.RESOLVED

                # 2. Add PPO Decision Record
                ppo_rec = PpoDecisionRecord(
                    event_id=self.active_event_id or "EVT-2026-0001",
                    strategy_name="STANDBY_MODULE_HOT_SWITCHOVER",
                    proposed_action=f"Execute zero-bus disruption switchover on {target} to redundant standby channel",
                    expected_impact="Core temperature drops to nominal 42°C within 3 seconds",
                    model_confidence=0.984,
                    risk_assessment="LOW",
                    status="APPROVED",
                    timestamp=utc_now()
                )
                db.add(ppo_rec)

                # 3. Add Computational Core Command Verification
                verif_rec = CommandVerification(
                    event_id=self.active_event_id or "EVT-2026-0001",
                    command_id=f"CMD-VERIF-{random.randint(1000, 9999)}",
                    target_subsystem=comp["subsystem"],
                    command_name="EXECUTE_STANDBY_SWITCHOVER",
                    proposed_command=f"SWITCHOVER_REDUNDANT_CHANNEL --target={target}",
                    safety_check="PASSED",
                    verified_library="VERIFIED",
                    rollback_status="ARMED_READY",
                    authorization_status="AUTHORIZED",
                    verification_status="PASSED",
                    validation_result="Safety envelope boundaries verified; command authorized for execution.",
                    actor="COMPUTATIONAL_CORE",
                    timestamp=utc_now()
                )
                db.add(verif_rec)

                # 4. Add Recovery Outcome
                outcome_rec = RecoveryOutcome(
                    mission_status="NOMINAL_CRUISE",
                    execution_status="EXECUTED",
                    duration_seconds=3.2,
                    notes=f"Autonomous switchover of {target} executed successfully. Telemetry restored to nominal envelope.",
                    timestamp=utc_now()
                )
                db.add(outcome_rec)

                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error persisting recovery in PostgreSQL: {e}")
            finally:
                db.close()

            return True
        return False

    def simulate_tick(self):
        """Simulates one dynamic time tick across all 50 components and appends to authoritative telemetry history."""
        self.tick_count += 1
        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        t = self.tick_count * 0.12

        # 1. Update each component
        for cid, comp in self.components_state.items():
            if comp["current_status"] == "FAULT_DETECTED" and cid == self.active_fault_component:
                # Keep elevated while fault is active
                comp["current_value"] = round(comp["critical_threshold"] + random.uniform(8.0, 14.0), 2)
                comp["health_score"] = round(random.uniform(22.0, 32.0), 1)
                comp["last_updated"] = now_str
                continue

            n_min = comp["nominal_min"]
            n_max = comp["nominal_max"]
            nominal_mid = (n_min + n_max) / 2.0
            amplitude = max(0.2, (n_max - n_min) * 0.12)

            # Orbital cycle modulation + unique hash phase per component
            phase_offset = (hash(cid) % 100) / 10.0
            val = nominal_mid + amplitude * math.sin(t + phase_offset) + random.uniform(-0.04, 0.04) * amplitude
            val = round(val, 2)
            comp["current_value"] = val
            comp["last_updated"] = now_str

            # Health calculation
            span = max(0.001, n_max - n_min)
            deviation = abs(val - nominal_mid) / (span / 2.0)
            comp["health_score"] = round(max(60.0, min(100.0, 100.0 - (deviation * 10.0) + random.uniform(-0.4, 0.4))), 1)

            # Sparkline update
            sp = self.sparklines[cid]
            sp.append(val)
            if len(sp) > 15:
                sp.pop(0)

        # 2. Extract Primary Channels Using Correct Component IDs
        # 2. Compute authoritative primary dashboard channels from exact physics components
        if self.fault_active:
            temp = self.components_state.get("CMP-FC-003", {}).get("current_value", 92.4)
            cpu = round(89.0 + random.uniform(2.0, 7.0), 1)
            power = round(136.0 + random.uniform(2.0, 6.0), 1)
            battery = round(84.2 + random.uniform(-0.3, 0.3), 1)
            comm = round(7.4 + random.uniform(0.2, 0.8), 2)
            margin = round(+(85.0 - temp), 2)
            anomaly = round(random.uniform(0.88, 0.96), 3)
        else:
            # CMP-FC-003 is the silicon junction temperature sensor (°C)
            temp = self.components_state.get("CMP-FC-003", {}).get("current_value")
            if temp is None or temp > 110.0:
                temp = round(48.5 + 4.2 * math.sin(t) + random.uniform(-0.3, 0.3), 2)

            # CMP-FC-004 is CPU Load (%)
            cpu = self.components_state.get("CMP-FC-004", {}).get("current_value")
            if cpu is None:
                cpu = round(42.0 + 8.5 * math.sin(t * 1.4) + random.uniform(-0.8, 0.8), 1)

            # CMP-PWR-001 is PDU bus current (A). Spacecraft Bus Power = Current * 28.0V Bus
            pdu_current = self.components_state.get("CMP-PWR-001", {}).get("current_value")
            if pdu_current is not None and 1.0 <= pdu_current <= 10.0:
                power = round(pdu_current * 28.0 + random.uniform(-0.5, 0.5), 1)
            else:
                power = round(106.0 + 5.8 * math.sin(t * 0.9) + random.uniform(-0.5, 0.5), 1)

            # CMP-PWR-003 is Battery State of Charge (%)
            battery = self.components_state.get("CMP-PWR-003", {}).get("current_value")
            if battery is None or battery < 40.0:
                battery = round(88.5 + 0.4 * math.sin(t * 0.3) + random.uniform(-0.1, 0.1), 1)

            # Deep-Space Comm latency (s) with occasional dispersion packet delay
            is_spike = (self.tick_count % 12 == 0)
            jitter = 4.1 if is_spike else random.uniform(-0.25, 0.25)
            comm = round(6.2 + 0.6 * math.sin(t * 0.6) + jitter, 2)

            # Thermal operating margin = Critical limit (85°C) - Core temp
            margin = round(+(85.0 - temp), 2)
            anomaly = round(max(0.01, min(0.12, 0.04 + 0.02 * math.sin(t) + random.uniform(-0.01, 0.01))), 3)

        # 3. Append to rolling authoritative history
        self.telemetry_history.append({
            "time": now.strftime("%H:%M:%S"),
            "timestamp": now_str,
            "processorTemperature": round(temp, 2),
            "processorLoad": round(cpu, 1),
            "powerDraw": round(power, 1),
            "batteryLevel": round(battery, 1),
            "communicationDelay": round(comm, 2),
            "thermalMargin": round(margin, 2),
            "anomalyScore": anomaly,
        })

    def get_full_snapshot(self) -> Dict[str, Any]:
        subsystems_summary: Dict[str, Dict[str, Any]] = {}
        for comp in self.components_state.values():
            sub = comp["subsystem"]
            if sub not in subsystems_summary:
                subsystems_summary[sub] = {
                    "subsystem": sub,
                    "total_components": 0,
                    "healthy_count": 0,
                    "warning_count": 0,
                    "critical_count": 0,
                    "total_health": 0.0,
                    "primary_metric_avg": 0.0,
                }
            s = subsystems_summary[sub]
            s["total_components"] += 1
            s["total_health"] += comp["health_score"]
            status = comp["current_status"]
            if status == "HEALTHY":
                s["healthy_count"] += 1
            elif status == "WARNING":
                s["warning_count"] += 1
            else:
                s["critical_count"] += 1

        for sub, s in subsystems_summary.items():
            if s["total_components"] > 0:
                s["average_health"] = round(s["total_health"] / s["total_components"], 1)

        # Get latest reading from rolling history
        latest = self.telemetry_history[-1] if self.telemetry_history else {
            "processorTemperature": 48.5,
            "processorLoad": 42.0,
            "powerDraw": 106.4,
            "batteryLevel": 88.5,
            "communicationDelay": 6.4,
            "thermalMargin": 36.5,
            "anomalyScore": 0.042,
        }

        components_list = []
        for cid, comp in self.components_state.items():
            item = dict(comp)
            item["sparkline"] = list(self.sparklines.get(cid, []))
            components_list.append(item)

        return {
            "type": "TELEMETRY_SNAPSHOT",
            "timestamp": utc_now().isoformat(),
            "simulation": {
                "isRunning": self.is_running,
                "intervalSeconds": self.interval_seconds,
                "tickCount": self.tick_count,
                "isSimulationMode": True,
                "faultActive": self.fault_active,
                "activeFaultComponent": self.active_fault_component,
                "activeEventId": self.active_event_id,
            },
            "spacecraft": {
                "missionStatus": "AUTONOMOUS_OPERATIONS" if not self.fault_active else "FAULT_CONTAINMENT_ACTIVE",
                "overallHealth": round(sum(c["health_score"] for c in self.components_state.values()) / max(1, len(self.components_state)), 1),
                "activeFaultCount": 1 if self.fault_active else 0,
                "metrics": {
                    "processorTemperature": latest["processorTemperature"],
                    "powerDraw": latest["powerDraw"],
                    "batteryLevel": latest["batteryLevel"],
                    "communicationDelay": latest["communicationDelay"],
                    "processorLoad": latest["processorLoad"],
                    "thermalMargin": latest["thermalMargin"],
                    "memoryUtilization": 44.1 + (self.tick_count % 8) * 0.3,
                    "sparkThroughputMsgSec": 12850 + (self.tick_count % 100) * 12,
                    "scalaBatchLatencyMs": 14.2 + (self.tick_count % 5) * 0.4,
                    "ppoConfidence": 98.4 if not self.fault_active else 94.8,
                    "computationalSafetyEnvelope": "SATISFIED",
                    "rollbackReadiness": "STANDBY_READY",
                }
            },
            "subsystems": list(subsystems_summary.values()),
            "components": components_list,
            "recentLogs": self.recent_logs[:15],
            "telemetryHistory": list(self.telemetry_history),
        }

    async def broadcast_tick(self):
        if not self.is_running:
            return

        self.simulate_tick()
        payload = self.get_full_snapshot()
        text = json.dumps(payload)

        disconnected = []
        for conn in list(self.active_connections):
            try:
                await conn.send_text(text)
            except Exception:
                disconnected.append(conn)

        for d in disconnected:
            self.disconnect(d)

    async def run_loop(self):
        logger.info("Starting Telemetry Simulation background loop...")
        while True:
            try:
                await self.broadcast_tick()
            except Exception as e:
                logger.error(f"Error in telemetry simulation tick: {e}", exc_info=True)
            await asyncio.sleep(self.interval_seconds)


stream_manager = TelemetryStreamManager()
