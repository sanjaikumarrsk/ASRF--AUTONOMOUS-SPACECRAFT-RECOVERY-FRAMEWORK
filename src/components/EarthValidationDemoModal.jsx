import React, { useState, useEffect, useRef } from 'react';
import {
  Globe, ShieldCheck, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2,
  XCircle, Clock, Send, Radio, Cpu, RotateCcw, X, Info,
  Play, Pause, FastForward, Check, ExternalLink
} from 'lucide-react';
import './EarthValidationDemoModal.css';

const TOTAL_STAGES = 8;

const STAGES = [
  { num: 1, label: '1. Fault Detection' },
  { num: 2, label: '2. LSTM Analysis' },
  { num: 3, label: '3. PPO Policy' },
  { num: 4, label: '4. Replication Core' },
  { num: 5, label: '5. Compute Core' },
  { num: 6, label: '6. Earth Package' },
  { num: 7, label: '7. Earth Decision' },
  { num: 8, label: '8. Final Outcome' },
];

export default function EarthValidationDemoModal({ isOpen, onClose }) {
  const [currentStage, setCurrentStage] = useState(1);
  const [earthDecision, setEarthDecision] = useState('APPROVED'); // 'APPROVED' | 'MODIFIED' | 'REQUEST_MORE_INFO' | 'REJECTED'

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrev = () => {
    setCurrentStage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setCurrentStage((prev) => Math.min(TOTAL_STAGES, prev + 1));
  };

  return (
    <div className="ev-modal-backdrop" onClick={onClose}>
      <div className="ev-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ─── Header ─── */}
        <div className="ev-modal-header">
          <div className="ev-modal-title-row">
            <div className="ev-icon-badge">
              <Globe size={20} color="#2563eb" />
            </div>
            <div>
              <div className="ev-header-topline">
                <h3 className="ev-modal-title">EARTH VALIDATION DEMONSTRATION</h3>
                <span className="ev-badge-chip">FLIGHT RULE 14.2 SIMULATION</span>
              </div>
              <p className="ev-modal-subtitle">
                Autonomous Spacecraft Recovery Protocol Requiring Ground Station Concurrence
              </p>
            </div>
          </div>
          <button className="ev-close-btn" onClick={onClose} title="Close Demonstration (ESC)">
            <X size={18} />
          </button>
        </div>

        {/* ─── Clean Horizontal Stepper ─── */}
        <div className="ev-stepper-container">
          <div className="ev-stepper-track">
            {STAGES.map((s) => {
              const isCompleted = s.num < currentStage;
              const isActive = s.num === currentStage;
              return (
                <button
                  key={s.num}
                  type="button"
                  className={`ev-step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => setCurrentStage(s.num)}
                >
                  <span className="ev-step-badge">
                    {isCompleted ? <Check size={12} strokeWidth={3} /> : s.num}
                  </span>
                  <span className="ev-step-text">{s.label.split('. ')[1]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Main Content Stage Panel ─── */}
        <div className="ev-modal-body">
          {/* STAGE 1 */}
          {currentStage === 1 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag">STAGE 01</span>
                <h4 className="ev-pane-title">Spacecraft Hardware Fault Detection</h4>
              </div>
              <div className="ev-two-col">
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Telemetry Parameter</span>
                  <p className="ev-box-val font-mono">RAD750 Processor Core Temperature</p>
                  <span className="ev-box-lbl">Sensor Address</span>
                  <p className="ev-box-val font-mono">CMP-FC-001 / THM_SENS_04</p>
                </div>
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Observed Spike</span>
                  <p className="ev-box-val text-red font-mono font-bold">88.4 °C (Tripwire: 85.0 °C)</p>
                  <span className="ev-box-lbl">Anomaly Status</span>
                  <p className="ev-box-val text-amber font-bold">THERMAL ENVELOPE BREACHED</p>
                </div>
              </div>
              <div className="ev-pane-summary">
                Bi-directional 1553B bus telemetry acquisition flagged anomalous thermal gradient during autonomous trajectory integration calculations.
              </div>
            </div>
          )}

          {/* STAGE 2 */}
          {currentStage === 2 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag">STAGE 02</span>
                <h4 className="ev-pane-title">LSTM Temporal Anomaly Classification</h4>
              </div>
              <div className="ev-two-col">
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Temporal Input Window</span>
                  <p className="ev-box-val">30-step consecutive multivariate array (1 Hz)</p>
                  <span className="ev-box-lbl">Classified Failure Mode</span>
                  <p className="ev-box-val font-bold text-purple">PROCESSOR_CORE_OVERHEATING</p>
                </div>
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Neural Confidence</span>
                  <p className="ev-box-val font-bold text-green font-mono">98.4% Confidence</p>
                  <span className="ev-box-lbl">Propagation Risk</span>
                  <p className="ev-box-val text-red font-bold">IMMINENT JUNCTION LOCK (T-45s)</p>
                </div>
              </div>
              <div className="ev-pane-summary">
                LSTM network filtered transient EMI noise and verified genuine thermal runaway resulting from thread scheduler livelock.
              </div>
            </div>
          )}

          {/* STAGE 3 */}
          {currentStage === 3 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag">STAGE 03</span>
                <h4 className="ev-pane-title">PPO Reinforcement Learning Policy Evaluation</h4>
              </div>
              <div className="ev-two-col">
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Candidate Policy Evaluated</span>
                  <p className="ev-box-val font-bold text-blue">WARM_PROCESSOR_RESTART + CACHE_FLUSH</p>
                  <span className="ev-box-lbl">Alternative Rejected</span>
                  <p className="ev-box-val text-muted">COLD_FAILOVER (4-min science blackout)</p>
                </div>
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Expected Safety Reward</span>
                  <p className="ev-box-val text-green font-mono font-bold">+0.962 / 1.000</p>
                  <span className="ev-box-lbl">Projected Downtime</span>
                  <p className="ev-box-val font-mono">3.4 seconds (SRAM state preserved)</p>
                </div>
              </div>
              <div className="ev-pane-summary">
                PPO policy evaluated multi-objective trade-offs between instantaneous thermal relief and preserving active guidance telemetry.
              </div>
            </div>
          )}

          {/* STAGE 4 */}
          {currentStage === 4 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag">STAGE 04</span>
                <h4 className="ev-pane-title">Replication Core Digital Twin Simulation</h4>
              </div>
              <div className="ev-two-col">
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Virtual Sandbox Engine</span>
                  <p className="ev-box-val">10x Accelerated Physics Simulator</p>
                  <span className="ev-box-lbl">Subsystem Interlock Check</span>
                  <p className="ev-box-val text-green font-bold">ZERO SECONDARY FAULTS DETECTED</p>
                </div>
                <div className="ev-col-box">
                  <span className="ev-box-lbl">State Rollback Armed</span>
                  <p className="ev-box-val text-green font-bold">CHECKPOINT CKP-2026-0001 (VALID)</p>
                  <span className="ev-box-lbl">Simulation Verdict</span>
                  <p className="ev-box-val text-green font-mono font-bold">PASS (100% Deterministic)</p>
                </div>
              </div>
              <div className="ev-pane-summary">
                Shadow vehicle model executed the reboot sequence in software memory. Electrical bus transient and radiator cooling curves confirmed safe.
              </div>
            </div>
          )}

          {/* STAGE 5 */}
          {currentStage === 5 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag">STAGE 05</span>
                <h4 className="ev-pane-title">Computational Core Deterministic Verification</h4>
              </div>
              <div className="ev-two-col">
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Command Grammar Check</span>
                  <p className="ev-box-val font-mono text-green font-bold">CCSDS-1553B SYNTAX VALID</p>
                  <span className="ev-box-lbl">Verified Command Library</span>
                  <p className="ev-box-val">Present (LIB-FC-004 · Signed Hash)</p>
                </div>
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Flight Rule 14.2 Check</span>
                  <p className="ev-box-val text-amber font-bold">EARTH CONCURRENCE MANDATORY</p>
                  <span className="ev-box-lbl">Execution Lock Status</span>
                  <p className="ev-box-val font-bold text-blue">HELD IN PRE-EXECUTION BUFFER</p>
                </div>
              </div>
              <div className="ev-pane-summary">
                Formal logic proved the command is syntactically sound. Because this alters flight computing state, Flight Rule 14.2 requires Earth confirmation.
              </div>
            </div>
          )}

          {/* STAGE 6 */}
          {currentStage === 6 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag">STAGE 06</span>
                <h4 className="ev-pane-title">Earth Evidence Package Assembly & Telemetry Uplink</h4>
              </div>
              <div className="ev-two-col">
                <div className="ev-col-box">
                  <span className="ev-box-lbl">DSN Link Frequency</span>
                  <p className="ev-box-val font-mono">Ka-Band 32 GHz (Madrid 70m DSN)</p>
                  <span className="ev-box-lbl">One-Way Light Time</span>
                  <p className="ev-box-val font-mono">14.2 Minutes (Mars Orbit)</p>
                </div>
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Evidence Bundle Contents</span>
                  <p className="ev-box-val">LSTM Weights, Replication Log, Rollback Hash</p>
                  <span className="ev-box-lbl">Transmission Status</span>
                  <p className="ev-box-val text-green font-bold font-mono">RECEIVED AT MISSION CONTROL</p>
                </div>
              </div>
              <div className="ev-pane-summary">
                Compressed telemetry manifest and verification proofs successfully transmitted to Ground Operations for flight director sign-off.
              </div>
            </div>
          )}

          {/* STAGE 7 */}
          {currentStage === 7 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag">STAGE 07</span>
                <h4 className="ev-pane-title">Earth Mission Control Decision Console</h4>
              </div>
              <div className="ev-decision-options">
                <label className={`ev-dec-card ${earthDecision === 'APPROVED' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="decision"
                    value="APPROVED"
                    checked={earthDecision === 'APPROVED'}
                    onChange={() => setEarthDecision('APPROVED')}
                  />
                  <div>
                    <span className="ev-dec-title text-green">1. APPROVE AS PROPOSED (Recommended)</span>
                    <p className="ev-dec-desc">Authorize immediate execution of warm restart and EDAC memory flush.</p>
                  </div>
                </label>

                <label className={`ev-dec-card ${earthDecision === 'MODIFIED' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="decision"
                    value="MODIFIED"
                    checked={earthDecision === 'MODIFIED'}
                    onChange={() => setEarthDecision('MODIFIED')}
                  />
                  <div>
                    <span className="ev-dec-title text-blue">2. APPROVE WITH MODIFICATIONS</span>
                    <p className="ev-dec-desc">Execute warm restart with 50% CPU clock throttle for additional thermal margin.</p>
                  </div>
                </label>

                <label className={`ev-dec-card ${earthDecision === 'REJECTED' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="decision"
                    value="REJECTED"
                    checked={earthDecision === 'REJECTED'}
                    onChange={() => setEarthDecision('REJECTED')}
                  />
                  <div>
                    <span className="ev-dec-title text-red">3. REJECT & SAFE-HOLD</span>
                    <p className="ev-dec-desc">Halt pathfinding computations and safe the rover in place.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STAGE 8 */}
          {currentStage === 8 && (
            <div className="ev-stage-pane">
              <div className="ev-pane-header">
                <span className="ev-pane-tag success">STAGE 08</span>
                <h4 className="ev-pane-title">Final Recovery Execution & Post-Recovery Health</h4>
              </div>
              <div className="ev-two-col">
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Execution Verdict</span>
                  <p className="ev-box-val font-bold text-green">
                    {earthDecision === 'APPROVED' ? 'WARM RESTART SUCCESSFULLY EXECUTED' : earthDecision === 'MODIFIED' ? 'THROTTLED RECOVERY COMPLETED' : 'SAFE-HOLD ENGAGED'}
                  </p>
                  <span className="ev-box-lbl">Core Temperature Normalized</span>
                  <p className="ev-box-val font-mono text-green font-bold">48.2 °C (Nominal Envelope)</p>
                </div>
                <div className="ev-col-box">
                  <span className="ev-box-lbl">Vehicle Health Index</span>
                  <p className="ev-box-val font-bold text-green font-mono">98.4% (Full Mission Capability)</p>
                  <span className="ev-box-lbl">Mission Continuity</span>
                  <p className="ev-box-val font-bold text-blue">SCIENCE & TRAVERSAL RESUMED</p>
                </div>
              </div>
              <div className="ev-pane-summary" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                End-to-end closed loop demonstrated. Ground validation concurred with autonomous recommendation, restoring nominal rover operations.
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer Controls ─── */}
        <div className="ev-modal-footer">
          <button
            type="button"
            className="ev-nav-btn"
            onClick={handlePrev}
            disabled={currentStage === 1}
          >
            <ArrowLeft size={14} />
            <span>Previous Stage</span>
          </button>

          <div className="ev-stage-indicator">
            Stage <strong>{currentStage}</strong> of <strong>{TOTAL_STAGES}</strong>
          </div>

          <button
            type="button"
            className="ev-nav-btn primary"
            onClick={handleNext}
            disabled={currentStage === TOTAL_STAGES}
          >
            <span>Next Stage</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
