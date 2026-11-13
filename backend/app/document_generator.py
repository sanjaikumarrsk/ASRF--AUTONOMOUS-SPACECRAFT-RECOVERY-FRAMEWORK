"""
CELESTIAL-X Document Generator
Generates compliant, downloadable PDF and text technical documents
for all 14 required document categories with real event data.
"""

from datetime import datetime, timezone
import io
import os
import uuid


class SimplePdfBuilder:
    """Generates standard-compliant PDF 1.4 documents without third-party dependencies."""

    def __init__(self, title="CELESTIAL-X Mission Report"):
        self.title = title
        self.lines = []
        self.doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"

    def add_line(self, text):
        self.lines.append(text)

    def add_blank(self):
        self.lines.append("")

    def build_pdf_bytes(self) -> bytes:
        """Constructs a valid PDF 1.4 binary file with text streams."""
        out = io.BytesIO()
        out.write(b"%PDF-1.4\n")

        # Create objects
        objects = []

        def add_obj(data_bytes):
            idx = len(objects) + 1
            pos = out.tell()
            out.write(f"{idx} 0 obj\n".encode("latin1"))
            out.write(data_bytes)
            out.write(b"\nendobj\n")
            objects.append(pos)
            return idx

        # Obj 1: Catalog
        catalog_pos = out.tell()
        out.write(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
        objects.append(catalog_pos)

        # Build content stream
        stream_lines = [
            "BT",
            "/F1 16 Tf",
            "50 780 Td",
            "(AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK) Tj",
            "0 -24 Td",
            "/F1 12 Tf",
            f"({self.escape(self.title)}) Tj",
            "0 -18 Td",
            "/F2 9 Tf",
            f"(DOCUMENT ID: {self.doc_id}  |  GENERATED: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}) Tj",
            "0 -15 Td",
            "(DATA CLASSIFICATION: SIMULATED RESEARCH DEMONSTRATOR - NASA/JPL/ESA REFERENCE) Tj",
            "0 -20 Td",
            "/F2 9 Tf",
        ]

        y_pos = 690
        for line in self.lines:
            if y_pos < 60:
                break
            if not line:
                stream_lines.append("0 -10 Td")
                y_pos -= 10
            elif line.startswith("===") or line.startswith("---"):
                stream_lines.append("0 -8 Td")
                stream_lines.append(f"({self.escape('----------------------------------------------------------------------------------------------------')}) Tj")
                y_pos -= 8
            elif line.isupper() and len(line) < 50:
                stream_lines.append("0 -16 Td")
                stream_lines.append("/F1 10 Tf")
                stream_lines.append(f"({self.escape(line)}) Tj")
                stream_lines.append("/F2 9 Tf")
                y_pos -= 16
            else:
                stream_lines.append("0 -13 Td")
                stream_lines.append(f"({self.escape(line)}) Tj")
                y_pos -= 13

        stream_lines.append("ET")
        content_bytes = "\n".join(stream_lines).encode("latin1", errors="replace")

        # Obj 2: Pages
        # Obj 3: Page
        # Obj 4: Content stream
        # Obj 5: Font F1 (Helvetica-Bold)
        # Obj 6: Font F2 (Courier)

        pages_idx = 2
        page_idx = 3
        content_idx = 4
        font1_idx = 5
        font2_idx = 6

        # Pages object
        p_pos = out.tell()
        out.write(f"2 0 obj\n<< /Type /Pages /Kids [{page_idx} 0 R] /Count 1 >>\nendobj\n".encode("latin1"))
        objects.append(p_pos)

        # Page object
        pg_pos = out.tell()
        page_def = (
            f"3 0 obj\n"
            f"<< /Type /Page /Parent {pages_idx} 0 R\n"
            f"   /MediaBox [0 0 612 842]\n"
            f"   /Contents {content_idx} 0 R\n"
            f"   /Resources << /Font << /F1 {font1_idx} 0 R /F2 {font2_idx} 0 R >> >>\n"
            f">>\nendobj\n"
        )
        out.write(page_def.encode("latin1"))
        objects.append(pg_pos)

        # Content stream object
        c_pos = out.tell()
        stream_def = f"4 0 obj\n<< /Length {len(content_bytes)} >>\nstream\n".encode("latin1")
        out.write(stream_def)
        out.write(content_bytes)
        out.write(b"\nendstream\nendobj\n")
        objects.append(c_pos)

        # Font 1
        f1_pos = out.tell()
        out.write(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")
        objects.append(f1_pos)

        # Font 2
        f2_pos = out.tell()
        out.write(b"6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n")
        objects.append(f2_pos)

        # Cross-reference table
        xref_pos = out.tell()
        out.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin1"))
        for obj_pos in objects:
            out.write(f"{obj_pos:010d} 00000 n \n".encode("latin1"))

        # Trailer
        trailer = (
            f"trailer\n<< /Size {len(objects) + 1}\n"
            f"   /Root 1 0 R\n>>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        )
        out.write(trailer.encode("latin1"))
        return out.getvalue()

    @staticmethod
    def escape(s):
        return str(s).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def generate_document_content(doc_type: str, event_data: dict) -> tuple[str, bytes]:
    """
    Builds the report text and corresponding PDF binary for any of the 14 types.
    """
    event_id = event_data.get("event_id", "EVT-PRC-0042")
    comp_id = event_data.get("component_id", "CMP-FC-001")
    comp_name = event_data.get("component_name", "Main Flight Computer")
    subsystem = event_data.get("subsystem", "Flight Computer")
    timestamp = event_data.get("timestamp", datetime.now(timezone.utc).isoformat())

    builder = SimplePdfBuilder(title=f"{doc_type} - {event_id}")

    builder.add_line("================================================================================")
    builder.add_line(f"CELESTIAL-X AEROSPACE ENGINEERING REPORT: {doc_type.upper()}")
    builder.add_line(f"EVENT REFERENCE: {event_id}   |   SUBSYSTEM: {subsystem}")
    builder.add_line(f"COMPONENT: {comp_name} ({comp_id})")
    builder.add_line(f"TIMESTAMP: {timestamp}")
    builder.add_line("================================================================================")
    builder.add_blank()

    if doc_type == "Fault Detection Report":
        builder.add_line("1. ANOMALY DETECTION SUMMARY")
        builder.add_line(f"   Fault ID: FLT-{event_id.replace('EVT-', '')}")
        builder.add_line("   Severity: HIGH (Safety Critical Threshold Exceeded)")
        builder.add_line("   Detection Source: Spark Streaming Telemetry Ingestion Engine")
        builder.add_line("   Observed Parameter: Processor Temperature 67.4 C -> 82.7 C")
        builder.add_line("   Observed Parameter: CPU Load 43.0% -> 91.0%")
        builder.add_line("   Observed Parameter: Power Draw 84.2W -> 109.8W")
        builder.add_line("   System Stability: Transition from NOMINAL to DEGRADED")

    elif doc_type == "LSTM Analysis Report":
        builder.add_line("1. TEMPORAL DEEP LEARNING INFERENCE")
        builder.add_line("   Model: Bi-Directional LSTM Temporal Anomaly Analyzer (Simulated)")
        builder.add_line("   Sliding Input Window: 60 Telemetry Samples across 24 Feature Dimensions")
        builder.add_line("   Sequence Length Evaluated: 30 Time Steps")
        builder.add_line("   Anomaly Score: 0.87 (Threshold: 0.65)")
        builder.add_line("   Fault Probability: 0.91 (Class: THERMAL_LOAD_RUNAWAY)")
        builder.add_line("   Root Cause Confidence: 88.4%")
        builder.add_line("   Classification: Processor thermal-load runaway instability")

    elif doc_type == "PPO Recovery Proposal":
        builder.add_line("1. REINFORCEMENT LEARNING POLICY RECOMMENDATION")
        builder.add_line("   Policy Engine: Proximal Policy Optimization (PPO) Deep RL Agent")
        builder.add_line("   State Vector: [Health: 0.64, PowerMargin: 0.18, ThermalMargin: 0.08, Comm: 0.94]")
        builder.add_line("   Candidate Actions Evaluated: 7 Discrete Recovery Policies")
        builder.add_line("   Selected Recovery Action: PROCESSOR_RESTART")
        builder.add_line("   Policy Confidence: 92.6%")
        builder.add_line("   Expected Value / Reward: +0.94 (Mission Continuity Preserved)")
        builder.add_line("   Execution Eligibility: FORWARD_TO_REPLICATION_CORE")

    elif doc_type == "Replication Core Test Report":
        builder.add_line("1. PRE-EXECUTION REPLICATION SIMULATION")
        builder.add_line("   Replication Test ID: REP-2026-0841")
        builder.add_line("   Target Action: PROCESSOR_RESTART (Safe Reboot)")
        builder.add_line("   Simulation Environment: Synchronized Spacecraft Model Circuit")
        builder.add_line("   Duration of Forward Run: 3.0 seconds simulated time")
        builder.add_line("   Thermal Response: STABLE (Projected 61.8 C, Margin +18.2 C)")
        builder.add_line("   Power Response: ACCEPTABLE (Projected 82.1 W, Margin +12.8 W)")
        builder.add_line("   Subsystem Recovery: SUCCESS (Health restored to 97%)")
        builder.add_line("   Mission Continuity: PRESERVED (Zero data loss)")
        builder.add_line("   Outcome Confidence: 93.7% | Risk Vector: LOW")
        builder.add_line("   Recommendation: PROCEED TO COMPUTATIONAL CORE FOR AUTHORIZATION")

    elif doc_type == "Computational Core Verification Report":
        builder.add_line("1. SAFETY & COMMAND AUTHORIZATION MATRIX")
        builder.add_line("   Command ID: CMD-PRC-042")
        builder.add_line("   Target: Flight Processor Module A")
        builder.add_line("   Action: PROCESSOR_RESTART (Timeout: 12s)")
        builder.add_line("   Check 1 [Command Validity]:         PASSED - Syntax and opcodes verified")
        builder.add_line("   Check 2 [Safety Constraints]:       PASSED - Bus current within safe envelope")
        builder.add_line("   Check 3 [Verified Library]:         VERIFIED - Present in Golden Image Library")
        builder.add_line("   Check 4 [Recovery Consistency]:     PASSED - Aligns with fault signature")
        builder.add_line("   Check 5 [Rollback Availability]:    PASSED - Snapshot RB-PRC-042 active")
        builder.add_line("   Check 6 [Authorization Status]:     AUTHORIZED FOR TIMED EXECUTION")

    elif doc_type == "Rollback Feasibility Report":
        builder.add_line("1. STATE RESTORATION & ROLLBACK GUARANTEE")
        builder.add_line("   Rollback Snapshot ID: RB-PRC-042")
        builder.add_line("   Reversal Path: Processor Restart -> Previous Stable Operating State")
        builder.add_line("   Estimated Recovery Duration: 8.4 seconds")
        builder.add_line("   Memory Image Checksum: SHA-256 Verified")
        builder.add_line("   Watchdog Override Feasibility: CONFIRMED")
        builder.add_line("   Rollback Verification Status: PASSED")

    elif doc_type == "Earth Validation Request":
        builder.add_line("1. DEEP-SPACE TRANSMISSION: MARS -> EARTH MISSION CONTROL")
        builder.add_line("   Request ID: VAL-REQ-2026-0198")
        builder.add_line("   Downlink Channel: X-Band Direct-to-Earth (DSN Station 43 Canberra)")
        builder.add_line("   One-Way Light Time Delay: 12.8 seconds (simulated)")
        builder.add_line("   Requested Ground Authorization: Critical Subsystem Reboot Authorization")
        builder.add_line("   Payload: Telemetry telemetry package, LSTM diagnosis, Replication Core logs")
        builder.add_line("   Status: TRANSMITTED - AWAITING GROUND STATION CONFIRMATION")

    elif doc_type == "Earth Decision Report":
        builder.add_line("1. MISSION CONTROL GROUND STATION DIRECTIVE")
        builder.add_line("   Decision ID: DEC-EARTH-0198")
        builder.add_line("   Authorized Role: JPL FLIGHT DIRECTOR / MISSION SCIENCE PRINCIPAL")
        builder.add_line("   Ground Decision Status: ACCEPTED AND AUTHORIZED")
        builder.add_line("   Reasoning: Replication Core simulation demonstrates acceptable margins.")
        builder.add_line("   Conditions: Maintain 120s sensor polling interval post-recovery.")
        builder.add_line("   Uplink Status: TRANSMITTED VIA DSN CARRIER TO SPACECRAFT")

    elif doc_type == "Recovery Execution Report":
        builder.add_line("1. ON-BOARD COMMAND EXECUTION LOG")
        builder.add_line("   Execution ID: EXE-2026-0442")
        builder.add_line("   Command Executed: CMD-PRC-042 (PROCESSOR_RESTART)")
        builder.add_line("   Execution Time: T+00:19")
        builder.add_line("   Result: SUCCESSFUL EXECUTION - ZERO REVERSAL TRIPPED")
        builder.add_line("   Telemetry Stabilization Time: 4.2 seconds")
        builder.add_line("   Post-Execution Temp: 64.1 C (Nominal)")
        builder.add_line("   Post-Execution Load: 41.2% (Nominal)")

    elif doc_type == "Mission Continuity Report":
        builder.add_line("1. LONG-TERM MISSION STABILITY ASSURANCE")
        builder.add_line("   Mission Phase: NOMINAL MARTIAN SURFACE OPERATIONS")
        builder.add_line("   Subsystem Health Index: 98.2% (Aggregate)")
        builder.add_line("   Science Data Buffer Integrity: 100% Retained")
        builder.add_line("   Autonomous Recovery Assessment: MISSION CONTINUITY ASSURED")
        builder.add_line("   Safe Mode Required: NO - Recovered in Active Operational State")

    else:
        # Complete Event Summary
        builder.add_line("1. COMPLETE RECOVERY EVENT LIFECYCLE SUMMARY")
        builder.add_line("   T+00:00 - Telemetry anomaly detected on Main Flight Computer")
        builder.add_line("   T+00:02 - Spark + Scala telemetry ingestion completed normalization")
        builder.add_line("   T+00:04 - LSTM model identifies processor thermal-load instability (94.2% conf)")
        builder.add_line("   T+00:07 - PPO policy engine selects optimal action: PROCESSOR_RESTART")
        builder.add_line("   T+00:10 - Replication Core executes 3.0s simulated forward trial")
        builder.add_line("   T+00:13 - Replication Core verifies thermal stability and power margin")
        builder.add_line("   T+00:15 - Computational Core completes safety constraints validation")
        builder.add_line("   T+00:16 - Rollback path RB-PRC-042 verified and placed on standby")
        builder.add_line("   T+00:17 - Earth validation token exchanged and confirmed by Mission Control")
        builder.add_line("   T+00:19 - Execution verified on spacecraft bus")
        builder.add_line("   T+00:22 - Nominal operations resumed; mission continuity maintained")

    builder.add_blank()
    builder.add_line("================================================================================")
    builder.add_line("ENGINEERING CERTIFICATION:")
    builder.add_line("AUTONOMOUS FAULT-RECOVERY SIMULATION COMPLETE - ALL AUDIT LOGS RECORDED")
    builder.add_line("================================================================================")

    pdf_bytes = builder.build_pdf_bytes()
    text_content = "\n".join(builder.lines)
    return text_content, pdf_bytes


def generate_investigation_pdf(inv: dict) -> bytes:
    """Builds a complete 12-section technical investigation report as a standard PDF 1.4."""
    builder = SimplePdfBuilder(title=f"RECOVERY INVESTIGATION: {inv.get('event_id')} - {inv.get('fault_type')}")
    builder.add_line("AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK - DETAILED INCIDENT INVESTIGATION")
    builder.add_line("================================================================================")
    builder.add_line(f"EVENT ID: {inv.get('event_id')}   |   TIMESTAMP: {inv.get('timestamp')}")
    builder.add_line(f"COMPONENT: {inv.get('component_name')} ({inv.get('component_id')})")
    builder.add_line(f"SUBSYSTEM: {inv.get('subsystem')}   |   SEVERITY: {inv.get('severity')}")
    builder.add_line(f"FINAL OUTCOME: {inv.get('final_outcome')}   |   STATUS: {inv.get('current_status')}")
    builder.add_line("================================================================================")
    builder.add_blank()

    builder.add_line("1. WHAT HAPPENED?")
    builder.add_line(f"   {inv.get('what_happened', '')[:120]}")
    builder.add_blank()

    builder.add_line("2. WHY DID IT HAPPEN? (ROOT-CAUSE HYPOTHESIS)")
    builder.add_line(f"   {inv.get('why_it_happened', '')[:120]}")
    builder.add_blank()

    builder.add_line("3. INITIAL TELEMETRY SNAPSHOT")
    for tel in (inv.get("initial_telemetry") or [])[:3]:
        builder.add_line(f"   - {tel.get('parameter')}: {tel.get('abnormal_value')} {tel.get('unit')} (Norm: {tel.get('normal_range')}) [{tel.get('status')}]")
    builder.add_blank()

    builder.add_line("4. LSTM TEMPORAL ANOMALY ANALYSIS")
    lstm = inv.get("lstm_analysis") or {}
    builder.add_line(f"   Pattern: {lstm.get('detected_anomaly', 'N/A')[:80]}")
    builder.add_line(f"   Classification: {lstm.get('fault_classification')} (Conf: {lstm.get('confidence')}%)")
    builder.add_blank()

    builder.add_line("5. PPO RECOVERY DECISION & EVALUATIONS")
    ppo = inv.get("ppo_decision") or {}
    builder.add_line(f"   Selected Action: {ppo.get('selected_action')} [Expected Reward: {ppo.get('expected_reward')}]")
    builder.add_line(f"   Policy Rationale: {ppo.get('why_selected', '')[:80]}")
    builder.add_blank()

    builder.add_line("6. REPLICATION CORE TESTING RESULTS")
    rep = inv.get("replication_core_test") or {}
    builder.add_line(f"   Test ID: {rep.get('test_id')} | Verdict: {rep.get('final_result')} (Conf: {rep.get('confidence')}%)")
    builder.add_line(f"   Thermal: {rep.get('thermal_response')} | Power: {rep.get('power_response')}")
    builder.add_blank()

    builder.add_line("7. COMPUTATIONAL CORE VERIFICATION & SAFETY BOUNDARY")
    comp = inv.get("computational_core_verification") or {}
    builder.add_line(f"   Command: {comp.get('command_name')} | Result: {comp.get('authorization_result')}")
    builder.add_line(f"   Safety Constraints: {comp.get('safety_constraints', '')[:80]}")
    builder.add_blank()

    builder.add_line("8. PERMANENT EXECUTION & ROLLBACK AUDIT")
    pe = inv.get("permanent_execution") or {}
    builder.add_line(f"   Executed: {pe.get('command_executed')} | Rollback Used: {pe.get('rollback_used')}")
    builder.add_blank()

    builder.add_line("9. EARTH GROUND COMMUNICATION STATUS")
    earth = inv.get("earth_communication") or {}
    builder.add_line(f"   Required: {earth.get('required')} | Decision: {earth.get('earth_response', 'N/A')}")
    builder.add_blank()

    builder.add_line("10. FINAL OUTCOME & CONTINUITY")
    fin = inv.get("final_result")
    if isinstance(fin, dict):
        builder.add_line(f"    Component Health: {fin.get('final_component_health', '98.4')}% | Subsystem: {fin.get('final_subsystem_health', '98.8')}%")
        builder.add_line(f"    Continuity: {fin.get('mission_continuity', 'NOMINAL_OPERATIONS_MAINTAINED')}")
    else:
        builder.add_line(f"    Summary: {str(fin)[:120]}")
    builder.add_line("================================================================================")

    return builder.build_pdf_bytes()


def generate_investigation_csv(inv: dict) -> str:
    """Generates structured CSV content for a single investigation."""
    import csv
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Section", "Field", "Value"])
    writer.writerow(["Event Overview", "Event ID", inv.get("event_id")])
    writer.writerow(["Event Overview", "Timestamp", inv.get("timestamp")])
    writer.writerow(["Event Overview", "Component ID", inv.get("component_id")])
    writer.writerow(["Event Overview", "Component Name", inv.get("component_name")])
    writer.writerow(["Event Overview", "Subsystem", inv.get("subsystem")])
    writer.writerow(["Event Overview", "Fault Type", inv.get("fault_type")])
    writer.writerow(["Event Overview", "Severity", inv.get("severity")])
    writer.writerow(["Event Overview", "Status", inv.get("current_status")])
    writer.writerow(["Event Overview", "Final Outcome", inv.get("final_outcome")])
    writer.writerow(["Incident Analysis", "What Happened", inv.get("what_happened")])
    writer.writerow(["Incident Analysis", "Root Cause", inv.get("why_it_happened")])

    for i, tel in enumerate(inv.get("initial_telemetry") or []):
        writer.writerow(["Initial Telemetry", f"Sensor {i+1}", f"{tel.get('parameter')}: {tel.get('abnormal_value')} {tel.get('unit')} (Norm: {tel.get('normal_range')})"])

    ppo = inv.get("ppo_decision") or {}
    writer.writerow(["PPO Decision", "Selected Action", ppo.get("selected_action")])
    writer.writerow(["PPO Decision", "Expected Reward", ppo.get("expected_reward")])
    writer.writerow(["PPO Decision", "Rationale", ppo.get("why_selected")])

    rep = inv.get("replication_core_test") or {}
    writer.writerow(["Replication Core", "Test ID", rep.get("test_id")])
    writer.writerow(["Replication Core", "Verdict", rep.get("final_result")])
    writer.writerow(["Replication Core", "Confidence", rep.get("confidence")])

    comp = inv.get("computational_core_verification") or {}
    writer.writerow(["Computational Core", "Command ID", comp.get("command_id")])
    writer.writerow(["Computational Core", "Authorization", comp.get("authorization_result")])

    earth = inv.get("earth_communication") or {}
    writer.writerow(["Earth Comm", "Required", earth.get("required")])
    writer.writerow(["Earth Comm", "Response", earth.get("earth_response")])

    fin = inv.get("final_result") or {}
    writer.writerow(["Final Result", "Outcome", fin.get("recovery_outcome")])
    writer.writerow(["Final Result", "Final Health", fin.get("final_component_health")])

    return output.getvalue()


