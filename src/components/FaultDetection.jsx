import React from 'react';
import { AlertTriangle, ArrowRight, Activity, Cpu, Settings, ShieldCheck, CheckCircle2 } from 'lucide-react';
import './FaultDetection.css';

const FaultDetection = ({ fault }) => {
  if (!fault) {
    return (
      <div className="fault-panel-container">
        <div className="fault-header" style={{ borderBottomColor: '#bbf7d0' }}>
          <div className="fault-title-group">
            <CheckCircle2 className="text-emerald-600 fault-icon" size={24} color="#16a34a" />
            <h2 className="fault-title" style={{ color: '#166534' }}>LSTM TELEMETRY LOOPS NOMINAL</h2>
          </div>
          <div className="fault-timestamp">{new Date().toLocaleString()} UTC</div>
        </div>

        <div className="fault-details-grid">
          <div className="fault-detail-item">
            <span className="detail-label">Model Confidence</span>
            <span className="detail-value monospace" style={{ color: '#16a34a' }}>98.4% NOMINAL</span>
          </div>
          <div className="fault-detail-item">
            <span className="detail-label">Inference Mode</span>
            <span className="detail-value flex items-center gap-2">
              <Cpu size={14} /> Bi-LSTM 1.0 Hz Active
            </span>
          </div>
          <div className="fault-detail-item">
            <span className="detail-label">Monitored Spacecraft Loops</span>
            <span className="detail-value flex items-center gap-2">
              <Settings size={14} /> 50 Components / 8 Subsystems
            </span>
          </div>
          <div className="fault-detail-item">
            <span className="detail-label">Anomaly Risk Score</span>
            <span className="severity-badge" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              0.04 (SAFE &lt; 0.70)
            </span>
          </div>
        </div>

        <p className="fault-description" style={{ color: '#475569' }}>
          All 50 physical telemetry streams are operating within calibrated nominal aerospace bounds. Deep learning LSTM sequence analyzer is actively processing 60-sample sliding windows without detected out-of-distribution deviations.
        </p>

        <div className="fault-changes-section">
          <h3 className="changes-title" style={{ color: '#166534' }}>
            <Activity size={16} /> SUBSYSTEM NOMINAL ENVELOPES
          </h3>
          <div className="changes-table">
            <div className="change-row">
              <div className="change-metric">Flight Computer (RAD750)</div>
              <div className="change-values" style={{ color: '#16a34a', fontWeight: 600 }}>Heartbeat 132 Hz · In-Spec</div>
            </div>
            <div className="change-row">
              <div className="change-metric">Power Distribution Unit (PDU)</div>
              <div className="change-values" style={{ color: '#16a34a', fontWeight: 600 }}>Main Bus 28.1V · Balanced</div>
            </div>
            <div className="change-row">
              <div className="change-metric">Thermal Loop (Heat Pipe A/B)</div>
              <div className="change-values" style={{ color: '#16a34a', fontWeight: 600 }}>Coolant Flow 0.42 L/min · Nominal</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const telemetry = fault.supportingTelemetry;
  const changes = telemetry ? [
    { metric: 'Processor Temperature', after: `${telemetry.processorTemperature ?? '—'} °C`, type: fault.severity === 'CRITICAL' || fault.severity === 'HIGH' ? 'critical' : 'warning' },
    { metric: 'Processor Load', after: `${telemetry.processorLoad ?? '—'}%`, type: telemetry.processorLoad > 90 ? 'critical' : 'warning' },
    { metric: 'Power Draw', after: `${telemetry.powerDraw ?? '—'} W`, type: telemetry.powerDraw > 130 ? 'critical' : 'warning' },
    { metric: 'Battery Level', after: `${telemetry.batteryLevel ?? '—'}%`, type: telemetry.batteryLevel < 25 ? 'critical' : 'warning' },
  ] : [];

  return (
    <div className="fault-panel-container">
      <div className="fault-header">
        <div className="fault-title-group">
          <AlertTriangle className="text-red-600 fault-icon" size={24} />
          <h2 className="fault-title">FAULT RECORD DETECTED</h2>
        </div>
        <div className="fault-timestamp">{new Date(fault.detectionTimestamp).toLocaleString()} UTC</div>
      </div>
      <div className="fault-details-grid">
        <div className="fault-detail-item"><span className="detail-label">Fault ID</span><span className="detail-value monospace">{fault.id}</span></div>
        <div className="fault-detail-item"><span className="detail-label">Subsystem</span><span className="detail-value flex items-center gap-2"><Cpu size={14}/> {fault.subsystemId}</span></div>
        <div className="fault-detail-item"><span className="detail-label">Fault type</span><span className="detail-value flex items-center gap-2"><Settings size={14}/> {fault.faultType}</span></div>
        <div className="fault-detail-item"><span className="detail-label">Severity / status</span><span className={`severity-badge severity-${String(fault.severity).toLowerCase()}`}>{fault.severity} · {fault.status}</span></div>
      </div>
      <p className="fault-description">{fault.description}</p>
      <div className="fault-changes-section">
        <h3 className="changes-title"><Activity size={16}/> SUPPORTING TELEMETRY</h3>
        <div className="changes-table">
          {changes.length ? changes.map((change) => (
            <div key={change.metric} className="change-row">
              <div className="change-metric">{change.metric}</div>
              <div className="change-values">
                <span className="value-before">Nominal baseline</span>
                <ArrowRight size={14} className={`change-arrow type-${change.type}`} />
                <span className={`value-after type-${change.type}`}>{change.after}</span>
              </div>
            </div>
          )) : <div className="empty-state">No supporting telemetry reference.</div>}
        </div>
      </div>
    </div>
  );
};

export default FaultDetection;
