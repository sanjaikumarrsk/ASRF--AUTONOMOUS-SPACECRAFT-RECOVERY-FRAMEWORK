"""
AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK API Routes
Includes:
- Authentication (PostgreSQL stored PBKDF2 credentials, multi-user support)
- 50-Component Spacecraft Catalog & Filtering
- Live Simulation Controls & Streaming Status
- Document Management (14 Downloadable Technical PDF Reports)
- Complete Event Lifecycle & Multi-Category Audit Records
- Telemetry & Fault Analytics
"""

import csv
from datetime import datetime, timezone
import io
import os
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, WebSocket, WebSocketDisconnect, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .ai import analyze_telemetry, explain_fault, recommend_recovery
from .auth import (
    authenticate_user,
    create_session,
    get_session_role,
    get_session_user,
    is_valid_session,
    register_user,
    terminate_session,
)
from .database import get_db
from .models import (
    AiAnalysisRecord,
    ApprovalStatus,
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
    SpacecraftTelemetry,
    User,
    utc_now,
)
from .document_generator import generate_investigation_pdf, generate_investigation_csv
from .schemas import (
    AiAnalysisRequest,
    AiAnalysisResponse,
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
from .services import (
    approve_strategy,
    create_fault,
    create_outcome,
    create_strategy,
    create_verification,
    dashboard_overview,
    fault_response,
    get_or_404,
    ingest_telemetry,
    latest_telemetry,
    outcome_response,
    patch_fault,
    search_faults,
    search_outcomes,
    search_strategies,
    search_telemetry,
    search_verifications,
    strategy_response,
    telemetry_response,
    verification_response,
)
from .telemetry_stream import stream_manager

router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


# ==============================================================================
# AUTHENTICATION ENDPOINTS (PostgreSQL + PBKDF2)
# ==============================================================================

@auth_router.post("/register", status_code=201)
def register(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username", "").strip()
    email = payload.get("email", "").strip()
    full_name = payload.get("fullName", payload.get("full_name", username)).strip()
    password = payload.get("password", "")
    role = payload.get("role", "SCIENTIST").strip().upper()

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Username, email, and password are required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    token, expires_at, user = register_user(
        db=db,
        name=full_name,
        email=email,
        username=username,
        password=password,
        role=role,
    )

    user_role_str = str(user.role)
    return {
        "accessToken": token,
        "tokenType": "bearer",
        "expiresAt": expires_at.isoformat(),
        "role": user_role_str,
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "fullName": user.name,
            "role": user_role_str,
            "organization": "NASA / JPL-Caltech",
        }
    }


@auth_router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username", "").strip()
    password = payload.get("password", "")

    token, expires_at, user = authenticate_user(db, username, password)
    user_role_str = str(user.role)

    return {
        "accessToken": token,
        "tokenType": "bearer",
        "expiresAt": expires_at.isoformat(),
        "role": user_role_str,
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "fullName": user.name,
            "role": user_role_str,
            "organization": "NASA / JPL-Caltech",
        }
    }


@auth_router.get("/me")
def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not is_valid_session(token):
        raise HTTPException(status_code=401, detail="Authentication is required.")

    username = get_session_user(token)
    role = get_session_role(token)
    user = db.scalar(select(User).where(User.username == username)) if username else None

    if not user:
        return {
            "authenticated": True,
            "username": username or "operator",
            "role": role or "OPERATOR",
            "fullName": "Mission Specialist",
            "organization": "NASA / JPL-Caltech",
        }

    return {
        "authenticated": True,
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "fullName": user.name,
        "role": str(user.role),
        "organization": "NASA / JPL-Caltech",
    }


@auth_router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() == "bearer" and token:
        terminate_session(token)
    return {"message": "Session logged out successfully."}


# ==============================================================================
# 50 SPACECRAFT COMPONENTS & SUBSYSTEMS API
# ==============================================================================

@router.get("/components")
def get_components(
    subsystem: Optional[str] = Query(None, description="Filter by Subsystem"),
    status: Optional[str] = Query(None, description="Filter by Component Status"),
    search: Optional[str] = Query(None, description="Search term for name or ID"),
    db: Session = Depends(get_db),
):
    query = select(SpacecraftComponent)
    if subsystem and subsystem.upper() not in ("ALL", "OVERALL SPACECRAFT", "OVERALL", "OVERALL SPACE PROBE"):
        sub_norm = subsystem.lower().strip()
        sub_mapping = {
            "flight_computer": "flight_computer",
            "flight computer": "flight_computer",
            "power": "power",
            "power_system": "power",
            "power system": "power",
            "thermal": "thermal",
            "thermal_control": "thermal",
            "thermal control": "thermal",
            "communication": "communication",
            "communication_system": "communication",
            "communication system": "communication",
            "navigation": "navigation",
            "navigation_system": "navigation",
            "navigation system": "navigation",
            "mobility": "mobility",
            "mobility_system": "mobility",
            "mobility system": "mobility",
            "scientific_sensors": "sensors",
            "scientific sensors": "sensors",
            "sensors": "sensors",
            "storage": "storage",
            "storage_data": "storage",
            "storage and data": "storage",
            "storage and data system": "storage",
            "storage_and_data_system": "storage",
        }
        target_sub = sub_mapping.get(sub_norm, sub_norm.replace(" ", "_"))
        query = query.where(
            or_(
                func.lower(SpacecraftComponent.subsystem) == target_sub,
                func.lower(SpacecraftComponent.subsystem) == sub_norm,
                func.lower(SpacecraftComponent.subsystem).like(f"%{target_sub}%"),
            )
        )
    if status and status.upper() not in ("ALL", "ANY"):
        query = query.where(func.upper(SpacecraftComponent.current_status) == status.upper().strip())
    if search:
        s = f"%{search.lower().strip()}%"
        query = query.where(
            or_(
                func.lower(SpacecraftComponent.name).like(s),
                func.lower(SpacecraftComponent.id).like(s),
                func.lower(SpacecraftComponent.description).like(s),
            )
        )

    items = db.scalars(query.order_by(SpacecraftComponent.subsystem, SpacecraftComponent.id)).all()

    subsystem_titles = {
        "flight_computer": "Flight Computer",
        "power": "Power System",
        "thermal": "Thermal Control",
        "communication": "Communication System",
        "navigation": "Navigation System",
        "mobility": "Mobility System",
        "sensors": "Scientific Sensors",
        "scientific_sensors": "Scientific Sensors",
        "storage": "Storage and Data System",
        "storage_data": "Storage and Data System",
    }

    results = []
    for item in items:
        cid = item.id
        live_info = stream_manager.components_state.get(cid, {})
        sparkline = stream_manager.sparklines.get(cid, [item.normal_range_min, item.normal_range_max])

        sub_display = subsystem_titles.get(item.subsystem.lower(), item.subsystem.replace("_", " ").title())
        results.append({
            "id": item.id,
            "component_id": item.id,
            "name": item.name,
            "subsystem": sub_display,
            "description": item.description,
            "operating_purpose": item.operating_purpose,
            "sensor_type": item.sensor_type,
            "primary_metric": item.sensor_type,
            "unit": item.operating_unit,
            "nominal_min": item.normal_range_min,
            "nominal_max": item.normal_range_max,
            "warning_threshold": item.warning_threshold,
            "critical_threshold": item.critical_threshold,
            "redundancy_type": "HOT_STANDBY",
            "redundancy_status": "ONLINE",
            "current_value": live_info.get("current_value", item.current_value),
            "current_status": live_info.get("current_status", item.current_status),
            "health_score": live_info.get("health_score", item.health_percentage),
            "last_updated": live_info.get("last_updated", item.last_updated.isoformat() if item.last_updated else None),
            "sparkline": sparkline,
        })
    return {"total": len(results), "components": results}


@router.get("/components/{component_id}")
def get_component_detail(component_id: str, db: Session = Depends(get_db)):
    comp = db.scalar(select(SpacecraftComponent).where(func.upper(SpacecraftComponent.id) == component_id.upper()))
    if not comp:
        raise HTTPException(status_code=404, detail=f"Component '{component_id}' not found.")

    live_info = stream_manager.components_state.get(comp.id, {})
    sparkline = stream_manager.sparklines.get(comp.id, [])

    readings = db.scalars(
        select(ComponentTelemetryReading)
        .where(ComponentTelemetryReading.component_id == comp.id)
        .order_by(ComponentTelemetryReading.timestamp.desc())
        .limit(30)
    ).all()

    subsystem_titles = {
        "flight_computer": "Flight Computer",
        "power": "Power System",
        "thermal": "Thermal Control",
        "communication": "Communication System",
        "navigation": "Navigation System",
        "mobility": "Mobility System",
        "sensors": "Scientific Sensors",
        "scientific_sensors": "Scientific Sensors",
        "storage": "Storage and Data System",
        "storage_data": "Storage and Data System",
    }
    sub_display = subsystem_titles.get(comp.subsystem.lower(), comp.subsystem.replace("_", " ").title())

    history = [
        {
            "timestamp": r.timestamp.isoformat(),
            "value": r.value,
            "unit": r.unit,
            "status": r.status,
        }
        for r in reversed(readings)
    ]

    return {
        "id": comp.id,
        "component_id": comp.id,
        "name": comp.name,
        "subsystem": sub_display,
        "description": comp.description,
        "operating_purpose": comp.operating_purpose,
        "sensor_type": comp.sensor_type,
        "primary_metric": comp.sensor_type,
        "unit": comp.operating_unit,
        "nominal_min": comp.normal_range_min,
        "nominal_max": comp.normal_range_max,
        "warning_threshold": comp.warning_threshold,
        "critical_threshold": comp.critical_threshold,
        "redundancy_type": "HOT_STANDBY",
        "redundancy_status": "ONLINE",
        "current_value": live_info.get("current_value", comp.current_value),
        "current_status": live_info.get("current_status", comp.current_status),
        "health_score": live_info.get("health_score", comp.health_percentage),
        "last_updated": live_info.get("last_updated", comp.last_updated.isoformat() if comp.last_updated else None),
        "sparkline": sparkline,
        "history": history,
        "recoveryRecommendations": [
            f"Autonomous switchover to redundant standby line",
            f"Sensor loop diagnostic verification for {comp.sensor_type}",
            f"Computational Core safety envelope command rollback",
        ]
    }


@router.get("/subsystems")
def get_subsystems(db: Session = Depends(get_db)):
    subsystems_list = [
        "Flight Computer",
        "Power",
        "Thermal",
        "Communication",
        "Navigation",
        "Mobility",
        "Scientific Sensors",
        "Storage & Data",
    ]
    snapshot = stream_manager.get_full_snapshot()
    live_subsystems_map = {s["subsystem"]: s for s in snapshot.get("subsystems", [])}

    output = []
    for sub in subsystems_list:
        live_sub = live_subsystems_map.get(sub, {})
        output.append({
            "name": sub,
            "total_components": live_sub.get("total_components", 6),
            "healthy_count": live_sub.get("healthy_count", 6),
            "warning_count": live_sub.get("warning_count", 0),
            "critical_count": live_sub.get("critical_count", 0),
            "average_health": live_sub.get("average_health", 98.2),
        })
    return output


# ==============================================================================
# LIVE SIMULATION CONTROLS & WEBSOCKET
# ==============================================================================

@router.get("/simulation/status")
def simulation_status():
    return {
        "isRunning": stream_manager.is_running,
        "intervalSeconds": stream_manager.interval_seconds,
        "frequencyHz": round(1.0 / max(0.1, stream_manager.interval_seconds), 2),
        "tickCount": stream_manager.tick_count,
        "faultActive": stream_manager.fault_active,
        "activeFaultComponent": stream_manager.active_fault_component,
        "activeEventId": stream_manager.active_event_id,
        "isSimulationMode": True,
    }


@router.post("/simulation/pause")
def pause_simulation():
    stream_manager.set_running(False)
    return {"status": "PAUSED", "isRunning": False}


@router.post("/simulation/resume")
def resume_simulation():
    stream_manager.set_running(True)
    return {"status": "RUNNING", "isRunning": True}


@router.post("/simulation/rate")
def set_simulation_rate(payload: dict):
    seconds = float(payload.get("intervalSeconds", 1.5))
    stream_manager.set_interval(seconds)
    return {"status": "UPDATED", "intervalSeconds": stream_manager.interval_seconds}


@router.post("/simulation/trigger-fault")
def trigger_simulation_fault(payload: dict = None):
    payload = payload or {}
    cid = payload.get("componentId", "FC_MOD_A")
    fault_type = payload.get("faultType", "CORE_OVERHEAT")
    success = stream_manager.trigger_fault(cid, fault_type)
    return {"success": success, "componentId": cid, "faultActive": stream_manager.fault_active}


@router.post("/simulation/recover")
def trigger_simulation_recover(payload: dict = None):
    payload = payload or {}
    cid = payload.get("componentId")
    success = stream_manager.recover_fault(cid)
    return {"success": success, "recoveredComponent": cid, "faultActive": stream_manager.fault_active}


@router.websocket("/telemetry/ws")
async def telemetry_websocket(websocket: WebSocket):
    await stream_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "pause":
                    stream_manager.set_running(False)
                elif action == "resume":
                    stream_manager.set_running(True)
                elif action == "trigger-fault":
                    stream_manager.trigger_fault(msg.get("componentId", "FC_MOD_A"))
                elif action == "recover":
                    stream_manager.recover_fault(msg.get("componentId"))
                await websocket.send_text(json.dumps(stream_manager.get_full_snapshot()))
            except Exception:
                pass
    except WebSocketDisconnect:
        stream_manager.disconnect(websocket)
    except Exception:
        stream_manager.disconnect(websocket)


# ==============================================================================
# DOCUMENT MANAGEMENT & EXPORT (14 Technical Reports)
# ==============================================================================

@router.get("/documents")
def list_documents(
    event_id: Optional[str] = Query(None, description="Filter by event id"),
    doc_type: Optional[str] = Query(None, description="Filter by document type"),
    db: Session = Depends(get_db),
):
    query = select(DocumentRecord)
    if event_id:
        query = query.where(func.upper(DocumentRecord.event_id) == event_id.upper().strip())
    if doc_type:
        query = query.where(func.lower(DocumentRecord.doc_type) == doc_type.lower().strip())

    items = db.scalars(query.order_by(DocumentRecord.generated_at.desc())).all()
    return [
        {
            "id": str(item.id),
            "document_id": item.document_id,
            "event_id": item.event_id,
            "doc_type": item.doc_type,
            "title": item.title,
            "filename": item.filename,
            "file_size_bytes": item.file_size_bytes,
            "mime_type": item.mime_type,
            "generated_at": item.generated_at.isoformat() if item.generated_at else None,
            "status": item.status,
            "download_url": f"/api/documents/{item.document_id}/download",
        }
        for item in items
    ]


@router.get("/documents/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.scalar(select(DocumentRecord).where(DocumentRecord.document_id == document_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file missing on disk.")

    return FileResponse(
        path=doc.file_path,
        media_type=doc.mime_type or "application/pdf",
        filename=doc.filename,
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'},
    )


@router.get("/documents/{document_id}/preview")
def preview_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.scalar(select(DocumentRecord).where(DocumentRecord.document_id == document_id))
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found.")

    return FileResponse(
        path=doc.file_path,
        media_type=doc.mime_type or "application/pdf",
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'},
    )


@router.get("/records/export/csv")
def export_records_csv(category: str = Query("all", description="Record Category"), db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)

    if category in ("all", "events", "timeline"):
        writer.writerow(["Timeline Offset", "Stage", "Event ID", "Title", "Subsystem", "Status", "Timestamp", "Description"])
        events = db.scalars(select(MissionEvent).order_by(MissionEvent.timeline_offset.asc())).all()
        for e in events:
            writer.writerow([
                e.timeline_offset,
                e.stage,
                e.event_id,
                e.title,
                e.subsystem,
                e.status,
                e.timestamp.isoformat() if e.timestamp else "",
                e.description,
            ])
    elif category == "components":
        writer.writerow(["Component ID", "Name", "Subsystem", "Metric", "Nominal Min", "Nominal Max", "Critical", "Status"])
        comps = db.scalars(select(SpacecraftComponent).order_by(SpacecraftComponent.subsystem)).all()
        for c in comps:
            writer.writerow([c.id, c.name, c.subsystem, c.sensor_type, c.normal_range_min, c.normal_range_max, c.critical_threshold, c.current_status])
    else:
        writer.writerow(["Timestamp", "Category", "Event ID", "Actor", "Action", "Result", "Details"])
        logs = db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200)).all()
        for l in logs:
            writer.writerow([l.timestamp.isoformat() if l.timestamp else "", l.category, l.event_id, l.actor, l.action, l.result, l.details])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="spacecraft_recovery_{category}_export.csv"'},
    )


# ==============================================================================
# AUDIT & EVENT LIFECYCLE ENDPOINTS (All 17 Categories)
# ==============================================================================

@router.get("/events/{event_id}/timeline")
def get_event_timeline(event_id: str, db: Session = Depends(get_db)):
    events = db.scalars(
        select(MissionEvent)
        .where(func.upper(MissionEvent.event_id) == event_id.upper())
        .order_by(MissionEvent.timeline_offset.asc())
    ).all()

    if not events:
        raise HTTPException(status_code=404, detail=f"No timeline found for event '{event_id}'")

    return [
        {
            "id": str(e.id),
            "event_id": e.event_id,
            "timeline_offset": e.timeline_offset,
            "stage": e.stage,
            "title": e.title,
            "description": e.description,
            "subsystem": e.subsystem,
            "status": e.status,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in events
    ]


# ==============================================================================
# 25 DETAILED RECOVERY INVESTIGATIONS (12-SECTION LIFECYCLE)
# ==============================================================================

@router.get("/records/investigations")
def get_investigations(
    search: Optional[str] = Query(None, description="Search term"),
    subsystem: Optional[str] = Query(None, description="Filter by Subsystem"),
    severity: Optional[str] = Query(None, description="Filter by Severity"),
    outcome: Optional[str] = Query(None, description="Filter by Outcome"),
    status: Optional[str] = Query(None, description="Filter by Status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = select(RecoveryInvestigation)
    if subsystem and subsystem.upper() not in ("ALL", "ANY"):
        query = query.where(func.lower(RecoveryInvestigation.subsystem).like(f"%{subsystem.lower().strip()}%"))
    if severity and severity.upper() not in ("ALL", "ANY"):
        query = query.where(func.upper(RecoveryInvestigation.severity) == severity.upper().strip())
    if outcome and outcome.upper() not in ("ALL", "ANY"):
        query = query.where(func.lower(RecoveryInvestigation.final_outcome).like(f"%{outcome.lower().strip()}%"))
    if status and status.upper() not in ("ALL", "ANY"):
        query = query.where(func.lower(RecoveryInvestigation.current_status).like(f"%{status.lower().strip()}%"))
    if search:
        s = f"%{search.lower().strip()}%"
        query = query.where(
            or_(
                func.lower(RecoveryInvestigation.event_id).like(s),
                func.lower(RecoveryInvestigation.component_name).like(s),
                func.lower(RecoveryInvestigation.component_id).like(s),
                func.lower(RecoveryInvestigation.fault_type).like(s),
                func.lower(RecoveryInvestigation.subsystem).like(s),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    records = db.scalars(query.order_by(RecoveryInvestigation.timestamp.desc()).offset(offset).limit(limit)).all()

    items = []
    for r in records:
        items.append({
            "id": str(r.id),
            "event_id": r.event_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else "",
            "component_id": r.component_id,
            "component_name": r.component_name,
            "subsystem": r.subsystem,
            "fault_type": r.fault_type,
            "severity": r.severity,
            "current_status": r.current_status,
            "final_outcome": r.final_outcome,
            "what_happened": r.what_happened,
            "why_it_happened": r.why_it_happened,
            "initial_telemetry": r.initial_telemetry,
            "lstm_analysis": r.lstm_analysis,
            "ppo_decision": r.ppo_decision,
            "replication_core_test": r.replication_core_test,
            "computational_core_verification": r.computational_core_verification,
            "permanent_execution": r.permanent_execution,
            "earth_communication": r.earth_communication,
            "final_result": r.final_result,
            "timeline": r.timeline,
        })
    return {"total": total, "investigations": items}


@router.get("/records/investigations-summary")
def get_investigations_summary(db: Session = Depends(get_db)):
    all_recs = db.scalars(select(RecoveryInvestigation)).all()
    total = len(all_recs)
    successful = 0
    failed = 0
    pending = 0
    earth_val = 0
    command_rejected = 0
    rollback_used = 0
    active_incidents = 0

    for r in all_recs:
        outcome = (r.final_outcome or "").upper()
        stat = (r.current_status or "").upper()
        if "SUCCESS" in outcome or "RESOLVED" in outcome or "VERIFIED" in outcome or "NOMINAL" in outcome:
            successful += 1
        elif "FAIL" in outcome or "UNRESOLVED" in outcome or "REJECTED" in outcome or "DEGRADED" in outcome:
            failed += 1

        if "IN PROGRESS" in stat or "PENDING" in stat or "ANALYZING" in stat:
            pending += 1

        earth = r.earth_communication or {}
        if earth.get("required") is True:
            earth_val += 1

        comp_core = r.computational_core_verification or {}
        if comp_core.get("authorization_status") == "REJECTED" or comp_core.get("safety_checks_status") == "FAIL":
            command_rejected += 1

        perm = r.permanent_execution or {}
        if perm.get("rollback_executed") is True or perm.get("rollback_used") is True:
            rollback_used += 1

        if stat not in ("RESOLVED", "NOMINAL"):
            active_incidents += 1

    return {
        "total_events": total,
        "successful_recoveries": successful,
        "failed_recoveries": failed,
        "pending_events": pending,
        "earth_validation_requests": earth_val,
        "commands_rejected": command_rejected,
        "rollbacks_activated": rollback_used,
        "active_incidents": active_incidents,
    }


@router.get("/records/investigations/{event_id}")
def get_investigation_detail(event_id: str, db: Session = Depends(get_db)):
    rec = db.scalar(
        select(RecoveryInvestigation).where(func.upper(RecoveryInvestigation.event_id) == event_id.upper().strip())
    )
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recovery investigation '{event_id}' not found.")

    return {
        "id": str(rec.id),
        "event_id": rec.event_id,
        "timestamp": rec.timestamp.isoformat() if rec.timestamp else "",
        "component_id": rec.component_id,
        "component_name": rec.component_name,
        "subsystem": rec.subsystem,
        "fault_type": rec.fault_type,
        "severity": rec.severity,
        "current_status": rec.current_status,
        "final_outcome": rec.final_outcome,
        "what_happened": rec.what_happened,
        "why_it_happened": rec.why_it_happened,
        "initial_telemetry": rec.initial_telemetry,
        "lstm_analysis": rec.lstm_analysis,
        "ppo_decision": rec.ppo_decision,
        "replication_core_test": rec.replication_core_test,
        "computational_core_verification": rec.computational_core_verification,
        "permanent_execution": rec.permanent_execution,
        "earth_communication": rec.earth_communication,
        "final_result": rec.final_result,
        "timeline": rec.timeline,
    }


@router.get("/records/investigations/{event_id}/pdf")
def download_investigation_pdf(event_id: str, db: Session = Depends(get_db)):
    rec = db.scalar(
        select(RecoveryInvestigation).where(func.upper(RecoveryInvestigation.event_id) == event_id.upper().strip())
    )
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recovery investigation '{event_id}' not found.")

    inv_dict = {
        "event_id": rec.event_id,
        "timestamp": rec.timestamp.isoformat() if rec.timestamp else "",
        "component_id": rec.component_id,
        "component_name": rec.component_name,
        "subsystem": rec.subsystem,
        "fault_type": rec.fault_type,
        "severity": rec.severity,
        "current_status": rec.current_status,
        "final_outcome": rec.final_outcome,
        "what_happened": rec.what_happened,
        "why_it_happened": rec.why_it_happened,
        "initial_telemetry": rec.initial_telemetry,
        "lstm_analysis": rec.lstm_analysis,
        "ppo_decision": rec.ppo_decision,
        "replication_core_test": rec.replication_core_test,
        "computational_core_verification": rec.computational_core_verification,
        "permanent_execution": rec.permanent_execution,
        "earth_communication": rec.earth_communication,
        "final_result": rec.final_result,
        "timeline": rec.timeline,
    }
    pdf_bytes = generate_investigation_pdf(inv_dict)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{rec.event_id}_investigation.pdf"'},
    )


@router.get("/records/investigations/{event_id}/csv")
def download_investigation_csv(event_id: str, db: Session = Depends(get_db)):
    rec = db.scalar(
        select(RecoveryInvestigation).where(func.upper(RecoveryInvestigation.event_id) == event_id.upper().strip())
    )
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recovery investigation '{event_id}' not found.")

    inv_dict = {
        "event_id": rec.event_id,
        "timestamp": rec.timestamp.isoformat() if rec.timestamp else "",
        "component_id": rec.component_id,
        "component_name": rec.component_name,
        "subsystem": rec.subsystem,
        "fault_type": rec.fault_type,
        "severity": rec.severity,
        "current_status": rec.current_status,
        "final_outcome": rec.final_outcome,
        "what_happened": rec.what_happened,
        "why_it_happened": rec.why_it_happened,
        "initial_telemetry": rec.initial_telemetry,
        "lstm_analysis": rec.lstm_analysis,
        "ppo_decision": rec.ppo_decision,
        "replication_core_test": rec.replication_core_test,
        "computational_core_verification": rec.computational_core_verification,
        "permanent_execution": rec.permanent_execution,
        "earth_communication": rec.earth_communication,
        "final_result": rec.final_result,
        "timeline": rec.timeline,
    }
    csv_str = generate_investigation_csv(inv_dict)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{rec.event_id}_investigation.csv"'},
    )


@router.get("/records/categories")
def get_records_categories(db: Session = Depends(get_db)):
    categories = [
        {"id": "investigations", "title": "12-Section Recovery Investigations", "count": db.scalar(select(func.count(RecoveryInvestigation.id))) or 0, "icon": "file-search"},
        {"id": "events", "title": "Mission Lifecycle Events", "count": db.scalar(select(func.count(MissionEvent.id))) or 0, "icon": "calendar"},
        {"id": "documents", "title": "Technical Reports (PDF)", "count": db.scalar(select(func.count(DocumentRecord.id))) or 0, "icon": "file-text"},
        {"id": "faults", "title": "Fault Detections (LSTM)", "count": db.scalar(select(func.count(FaultDetection.id))) or 0, "icon": "alert-triangle"},
        {"id": "ppo", "title": "PPO Recovery Proposals", "count": db.scalar(select(func.count(PpoDecisionRecord.id))) or 0, "icon": "cpu"},
        {"id": "replication", "title": "Replication Core Sandbox Tests", "count": db.scalar(select(func.count(ReplicationTestRecord.id))) or 0, "icon": "layers"},
        {"id": "computational", "title": "Computational Core Verifications", "count": db.scalar(select(func.count(CommandVerification.id))) or 0, "icon": "shield-check"},
        {"id": "rollback", "title": "Rollback Checkpoint States", "count": db.scalar(select(func.count(RollbackRecord.id))) or 0, "icon": "rotate-ccw"},
        {"id": "earth_req", "title": "Earth Validation Requests", "count": db.scalar(select(func.count(EarthValidationRequest.id))) or 0, "icon": "globe"},
        {"id": "earth_dec", "title": "Earth Validation Decisions", "count": db.scalar(select(func.count(EarthValidationDecision.id))) or 0, "icon": "check-circle"},
        {"id": "comm", "title": "Deep Space Comm Transmissions", "count": db.scalar(select(func.count(CommunicationMessage.id))) or 0, "icon": "radio"},
        {"id": "strategies", "title": "Recovery Strategies Library", "count": db.scalar(select(func.count(RecoveryStrategy.id))) or 0, "icon": "git-branch"},
        {"id": "outcomes", "title": "Mission Recovery Outcomes", "count": db.scalar(select(func.count(RecoveryOutcome.id))) or 0, "icon": "award"},
        {"id": "telemetry", "title": "High-Rate Telemetry Log", "count": db.scalar(select(func.count(SpacecraftTelemetry.id))) or 0, "icon": "activity"},
        {"id": "components", "title": "Component Registry (50 Units)", "count": db.scalar(select(func.count(SpacecraftComponent.id))) or 0, "icon": "database"},
        {"id": "health", "title": "Component Health Archives", "count": db.scalar(select(func.count(ComponentHealthHistory.id))) or 0, "icon": "heart"},
        {"id": "audit", "title": "System Audit Trail", "count": db.scalar(select(func.count(AuditLog.id))) or 0, "icon": "clipboard"},
        {"id": "ai_analyses", "title": "AI Diagnostics & Explanations", "count": db.scalar(select(func.count(AiAnalysisRecord.id))) or 0, "icon": "zap"},
    ]
    return categories


@router.get("/records/category/{category_id}")
def get_category_records(
    category_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    cat = category_id.lower().strip()
    if cat == "investigations":
        items = db.scalars(select(RecoveryInvestigation).order_by(RecoveryInvestigation.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "event_id": i.event_id, "timestamp": i.timestamp.isoformat() if i.timestamp else "", "component": f"{i.component_name} ({i.component_id})", "subsystem": i.subsystem, "fault": i.fault_type, "severity": i.severity, "status": i.current_status, "outcome": i.final_outcome} for i in items]
    elif cat == "events":
        items = db.scalars(select(MissionEvent).order_by(MissionEvent.timeline_offset.asc()).limit(limit)).all()
        return [{"id": str(i.id), "event_id": i.event_id, "offset": i.timeline_offset, "stage": i.stage, "subsystem": i.subsystem, "title": i.title, "status": i.status, "description": i.description, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "documents":
        items = db.scalars(select(DocumentRecord).order_by(DocumentRecord.generated_at.desc()).limit(limit)).all()
        return [{"id": str(i.id), "doc_id": i.document_id, "type": i.doc_type, "title": i.title, "filename": i.filename, "size": f"{i.file_size_bytes/1024:.1f} KB", "status": i.status, "download_url": f"/api/documents/{i.document_id}/download"} for i in items]
    elif cat == "faults":
        items = db.scalars(select(FaultDetection).order_by(FaultDetection.detection_timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "subsystem": i.subsystem_id, "fault_type": i.fault_type, "severity": i.severity.value if hasattr(i.severity, "value") else str(i.severity), "status": i.status.value if hasattr(i.status, "value") else str(i.status), "description": i.description, "timestamp": i.detection_timestamp.isoformat() if i.detection_timestamp else ""} for i in items]
    elif cat == "ppo":
        items = db.scalars(select(PpoDecisionRecord).order_by(PpoDecisionRecord.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "event_id": i.event_id, "strategy_name": i.strategy_name, "confidence": i.model_confidence, "proposed_action": i.proposed_action, "expected_impact": i.expected_impact, "risk_assessment": i.risk_assessment, "status": i.status, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "replication":
        items = db.scalars(select(ReplicationTestRecord).order_by(ReplicationTestRecord.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "event_id": i.event_id, "sandbox_run_id": i.sandbox_run_id, "cycles": i.simulation_cycles, "sandbox_status": i.sandbox_status, "side_effects": i.observed_side_effects, "stability_margin": i.stability_margin, "verdict": i.sandbox_verdict, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "computational":
        items = db.scalars(select(CommandVerification).order_by(CommandVerification.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "command_id": i.command_id, "target": i.target_subsystem, "command_name": i.command_name, "safety": i.safety_check, "library": i.verified_library, "rollback": i.rollback_status, "auth": i.authorization_status, "status": i.verification_status, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "rollback":
        items = db.scalars(select(RollbackRecord).order_by(RollbackRecord.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "plan_id": i.plan_id, "event_id": i.event_id, "target": i.target_subsystem, "state_snapshot": i.state_snapshot, "estimated_recovery_time_sec": i.estimated_recovery_time_sec, "integrity": i.integrity_hash, "status": i.status, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "earth_req":
        items = db.scalars(select(EarthValidationRequest).order_by(EarthValidationRequest.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "request_id": i.request_id, "event_id": i.event_id, "strategy_name": i.strategy_name, "timeout_seconds": i.timeout_seconds, "urgency": i.urgency_level, "status": i.status, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "earth_dec":
        items = db.scalars(select(EarthValidationDecision).order_by(EarthValidationDecision.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "request_id": i.request_id, "event_id": i.event_id, "decision": i.decision, "flight_director": i.flight_director, "notes": i.operator_notes, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "comm":
        items = db.scalars(select(CommunicationMessage).order_by(CommunicationMessage.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "msg_id": i.message_id, "direction": i.direction, "channel": i.channel, "latency_sec": i.latency_seconds, "content": i.payload_summary, "status": i.delivery_status, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "strategies":
        items = db.scalars(select(RecoveryStrategy).order_by(RecoveryStrategy.created_at.desc()).limit(limit)).all()
        return [{"id": str(i.id), "name": i.strategy_name, "subsystem": i.subsystem_id, "confidence": i.confidence_score, "approval": i.approval_status.value if hasattr(i.approval_status, "value") else str(i.approval_status), "description": i.description, "created_at": i.created_at.isoformat() if i.created_at else ""} for i in items]
    elif cat == "outcomes":
        items = db.scalars(select(RecoveryOutcome).order_by(RecoveryOutcome.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "mission_status": i.mission_status, "exec_status": i.execution_status, "duration_sec": i.duration_seconds, "notes": i.notes, "timestamp": i.timestamp.isoformat() if i.timestamp else ""} for i in items]
    elif cat == "components":
        items = db.scalars(select(SpacecraftComponent).order_by(SpacecraftComponent.subsystem, SpacecraftComponent.component_id).limit(limit)).all()
        return [{"id": str(i.id), "cid": i.component_id, "name": i.name, "subsystem": i.subsystem, "metric": i.primary_metric, "unit": i.unit, "nominal": f"{i.nominal_min} - {i.nominal_max}", "critical": i.critical_threshold, "redundancy": i.redundancy_type} for i in items]
    else:
        items = db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)).all()
        return [{"id": str(i.id), "timestamp": i.timestamp.isoformat() if i.timestamp else "", "category": i.category, "event_id": i.event_id, "actor": i.actor, "action": i.action, "result": i.result, "details": i.details} for i in items]


# ==============================================================================
# EXISTING TELEMETRY, DASHBOARD & AI BACKWARD-COMPATIBLE ENDPOINTS
# ==============================================================================

@router.get("/telemetry", response_model=PageResponse[TelemetryResponse])
def get_telemetry(
    subsystemId: str | None = None,
    from_time: datetime | None = Query(None, alias="from"),
    to_time: datetime | None = Query(None, alias="to"),
    page: int = Query(0, ge=0),
    size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return search_telemetry(db, subsystemId, from_time, to_time, page, size)


@router.get("/telemetry/latest", response_model=list[TelemetryResponse])
def get_latest_telemetry(db: Session = Depends(get_db)):
    return latest_telemetry(db)


@router.get("/telemetry/history")
def get_telemetry_history():
    """Returns authoritative rolling historical telemetry (60-120 points) for dashboard channels."""
    return {
        "count": len(stream_manager.telemetry_history),
        "history": list(stream_manager.telemetry_history)
    }


@router.post("/telemetry", response_model=TelemetryResponse, status_code=201)
def post_telemetry(request: TelemetryRequest, db: Session = Depends(get_db)):
    reading = ingest_telemetry(db, request)
    return telemetry_response(reading)


@router.get("/faults", response_model=PageResponse[FaultResponse])
def get_faults(
    subsystemId: str | None = None,
    status: FaultStatus | None = None,
    severity: FaultSeverity | None = None,
    page: int = Query(0, ge=0),
    size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return search_faults(db, subsystemId, status, severity, page, size)


@router.get("/faults/{fault_id}", response_model=FaultResponse)
def get_fault(fault_id: UUID, db: Session = Depends(get_db)):
    return fault_response(get_or_404(db, FaultDetection, fault_id, "Fault"))


@router.post("/faults", response_model=FaultResponse, status_code=201)
def post_fault(request: FaultRequest, db: Session = Depends(get_db)):
    return create_fault(db, request)


@router.patch("/faults/{fault_id}", response_model=FaultResponse)
def update_fault(fault_id: UUID, request: FaultPatchRequest, db: Session = Depends(get_db)):
    return patch_fault(db, fault_id, request)


@router.get("/recovery-strategies", response_model=PageResponse[RecoveryStrategyResponse])
def get_recovery_strategies(
    subsystemId: str | None = None,
    approvalStatus: ApprovalStatus | None = None,
    page: int = Query(0, ge=0),
    size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return search_strategies(db, subsystemId, approvalStatus, page, size)


@router.get("/recovery-strategies/{strategy_id}", response_model=RecoveryStrategyResponse)
def get_recovery_strategy(strategy_id: UUID, db: Session = Depends(get_db)):
    return strategy_response(get_or_404(db, RecoveryStrategy, strategy_id, "Recovery strategy"))


@router.post("/recovery-strategies", response_model=RecoveryStrategyResponse, status_code=201)
def post_recovery_strategy(request: RecoveryStrategyRequest, db: Session = Depends(get_db)):
    return create_strategy(db, request)


@router.post("/recovery-strategies/{strategy_id}/approve", response_model=RecoveryStrategyResponse)
def approve_recovery_strategy(strategy_id: UUID, db: Session = Depends(get_db)):
    return approve_strategy(db, strategy_id)


@router.get("/command-verifications")
def get_command_verifications(
    status: str | None = None,
    strategyId: UUID | None = None,
    page: int = Query(0, ge=0),
    size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return search_verifications(db, status, strategyId, page, size)


@router.get("/recovery-outcomes", response_model=PageResponse[RecoveryOutcomeResponse])
def get_recovery_outcomes(
    missionStatus: str | None = None,
    executionStatus: str | None = None,
    page: int = Query(0, ge=0),
    size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return search_outcomes(db, missionStatus, executionStatus, page, size)


@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(db: Session = Depends(get_db)):
    return dashboard_overview(db)


@router.get("/dashboard/subsystems", response_model=list[SubsystemSummary])
def get_dashboard_subsystems(db: Session = Depends(get_db)):
    return dashboard_overview(db).subsystems


@router.get("/dashboard/health-summary")
def get_health_summary(db: Session = Depends(get_db)):
    overview = dashboard_overview(db)
    average = sum(item.health for item in overview.subsystems) / len(overview.subsystems) if overview.subsystems else 0.0
    return {
        "missionStatus": overview.missionStatus,
        "health": round(average, 2),
        "hasData": overview.hasData,
        "activeFaultCount": overview.activeFaultCount,
        "thresholdsConfigured": True,
    }


@router.get("/dashboard/recent-faults", response_model=list[FaultResponse])
def get_recent_faults(limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    items = db.scalars(select(FaultDetection).order_by(FaultDetection.detection_timestamp.desc()).limit(limit)).all()
    return [fault_response(item) for item in items]


@router.post("/ai/telemetry-analysis", response_model=AiAnalysisResponse)
def ai_telemetry(request: AiAnalysisRequest):
    result = analyze_telemetry(request)
    return JSONResponse(status_code=200 if result.available else 503, content=result.model_dump(mode="json"))


@router.post("/ai/fault-explanation", response_model=AiAnalysisResponse)
def ai_fault(request: AiAnalysisRequest):
    result = explain_fault(request)
    return JSONResponse(status_code=200 if result.available else 503, content=result.model_dump(mode="json"))


@router.post("/ai/recovery-recommendations", response_model=AiAnalysisResponse)
def ai_recovery(request: AiAnalysisRequest):
    result = recommend_recovery(request)
    return JSONResponse(status_code=200 if result.available else 503, content=result.model_dump(mode="json"))
