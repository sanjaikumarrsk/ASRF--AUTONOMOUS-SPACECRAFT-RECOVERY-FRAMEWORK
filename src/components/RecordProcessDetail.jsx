import React, { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Cpu, GitBranch, RotateCcw, ShieldCheck, X } from 'lucide-react';
import './RecordProcessDetail.css';

const readingFields = [
  ['Processor temperature', 'processorTemperature', '°C'],
  ['Power draw', 'powerDraw', 'W'],
  ['Battery level', 'batteryLevel', '%'],
  ['Communication delay', 'communicationDelay', 's'],
  ['Processor load', 'processorLoad', '%'],
  ['Memory utilization', 'memoryUtilization', '%'],
  ['Storage utilization', 'storageUtilization', '%'],
];

const uniqueById = (items) => Array.from(new Map(items.filter(Boolean).map((item) => [item.id, item])).values());
const formatValue = (value, suffix = '') => value === null || value === undefined ? '—' : `${typeof value === 'number' ? value.toFixed(2) : value}${suffix}`;
const formatDate = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};
const badgeClass = (value) => {
  const normalized = String(value || 'NOT_RECORDED').toLowerCase();
  if (['success', 'approved', 'passed', 'executed', 'nominal'].includes(normalized)) return 'is-success';
  if (['open', 'high', 'critical', 'failed'].includes(normalized)) return 'is-danger';
  if (['proposed', 'pending', 'investigating', 'degraded', 'not_executed'].includes(normalized)) return 'is-warning';
  return 'is-neutral';
};
const StatusBadge = ({ value }) => <span className={`process-badge ${badgeClass(value)}`}>{value || 'NOT_RECORDED'}</span>;

export default function RecordProcessDetail({ record, telemetry = [], faults = [], strategies = [], verifications = [], outcomes = [], onClose }) {
  const process = useMemo(() => {
    if (!record) return null;
    const selectedTelemetry = record.eventType === 'Telemetry' ? telemetry.find((item) => item.id === record.eventId) : null;
    const selectedFault = record.eventType === 'Fault' ? faults.find((item) => item.id === record.eventId) : null;
    const selectedStrategy = record.eventType === 'Recovery Strategy' ? strategies.find((item) => item.id === record.eventId) : null;
    const selectedVerification = record.eventType === 'Command Verification' ? verifications.find((item) => item.id === record.eventId) : null;
    const selectedOutcome = record.eventType === 'Recovery Outcome' ? outcomes.find((item) => item.id === record.eventId) : null;
    const faultItems = uniqueById([
      selectedFault,
      ...faults.filter((item) => selectedTelemetry && item.supportingTelemetry?.id === selectedTelemetry.id),
      ...faults.filter((item) => selectedStrategy?.faultId === item.id),
      ...faults.filter((item) => selectedVerification && strategies.find((strategy) => strategy.id === selectedVerification.strategyId)?.faultId === item.id),
      ...faults.filter((item) => selectedOutcome?.faultId === item.id),
    ]);
    const faultIds = new Set(faultItems.map((item) => item.id));
    const strategyItems = uniqueById([
      selectedStrategy,
      ...strategies.filter((item) => faultIds.has(item.faultId)),
      ...strategies.filter((item) => selectedVerification?.strategyId === item.id),
      ...strategies.filter((item) => selectedOutcome?.strategyId === item.id),
    ]);
    const strategyIds = new Set(strategyItems.map((item) => item.id));
    const verificationItems = uniqueById([
      selectedVerification,
      ...verifications.filter((item) => strategyIds.has(item.strategyId)),
      ...verifications.filter((item) => selectedOutcome?.verificationId === item.id),
    ]);
    const verificationIds = new Set(verificationItems.map((item) => item.id));
    const outcomeItems = uniqueById([
      selectedOutcome,
      ...outcomes.filter((item) => faultIds.has(item.faultId) || strategyIds.has(item.strategyId) || verificationIds.has(item.verificationId)),
    ]);
    const telemetryItems = uniqueById([
      selectedTelemetry,
      ...faultItems.map((item) => item.supportingTelemetry),
      ...telemetry.filter((item) => faultItems.some((fault) => fault.supportingTelemetry?.id === item.id)),
    ]);
    const timeline = [
      ...telemetryItems.map((item) => ({ timestamp: item.timestamp, label: 'Telemetry captured', detail: `${item.subsystemId} reading stored`, tone: 'telemetry' })),
      ...faultItems.map((item) => ({ timestamp: item.detectionTimestamp, label: 'Fault detected', detail: `${item.faultType} · ${item.severity}`, tone: 'fault' })),
      ...strategyItems.map((item) => ({ timestamp: item.createdTimestamp, label: 'Recovery decision', detail: `${item.name} · ${item.approvalStatus}`, tone: 'decision' })),
      ...verificationItems.map((item) => ({ timestamp: item.timestamp, label: 'Computational Core', detail: `${item.commandId} · ${item.verificationStatus}`, tone: 'verification' })),
      ...outcomeItems.map((item) => ({ timestamp: item.executionTimestamp || item.completionTimestamp, label: 'Replication Core outcome', detail: `${item.recoveryOutcome} · ${item.executionStatus}`, tone: 'execution' })),
    ].filter((item) => item.timestamp).sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
    return { telemetryItems, faultItems, strategyItems, verificationItems, outcomeItems, timeline };
  }, [record, telemetry, faults, strategies, verifications, outcomes]);

  if (!record || !process) return null;
  const primaryTelemetry = process.telemetryItems[0];
  const primaryFault = process.faultItems[0];
  const primaryStrategy = process.strategyItems[0];
  const primaryVerification = process.verificationItems[0];
  const hasRollbackPath = process.verificationItems.some((item) => item.verificationStatus?.toUpperCase() === 'PASSED');
  const coreStatus = hasRollbackPath ? 'PASSED' : primaryVerification?.verificationStatus || 'PENDING';

  return (
    <section className="record-process-detail" aria-label="Selected record process details">
      <div className="process-detail-header">
        <div><p className="process-detail-eyebrow">SELECTED RECORD · {record.eventType.toUpperCase()}</p><h2>{record.action || record.eventId}</h2><p className="process-detail-subtitle">Complete trace from reading to decision, verification, replication, and rollback readiness.</p></div>
        <button type="button" className="process-close" onClick={onClose} aria-label="Close record details"><X size={18} /></button>
      </div>
      <div className="process-summary-grid">
        <div><span>Record ID</span><strong className="process-mono">{record.eventId}</strong></div><div><span>Subsystem</span><strong>{record.subsystem}</strong></div><div><span>Captured</span><strong>{formatDate(record.timestamp)}</strong></div><div><span>Current result</span><StatusBadge value={record.result} /></div>
      </div>
      <div className="process-detail-grid">
        <section className="process-card process-card-wide"><div className="process-card-title"><Activity size={18} /><h3>1. READINGS &amp; EVIDENCE</h3></div>{primaryTelemetry ? <><p className="process-muted">Telemetry captured from <strong>{primaryTelemetry.subsystemId}</strong> at {formatDate(primaryTelemetry.timestamp)}.</p><div className="reading-grid">{readingFields.map(([label, key, unit]) => <div className="reading-cell" key={key}><span>{label}</span><strong>{formatValue(primaryTelemetry[key], unit)}</strong></div>)}</div></> : <p className="process-empty">No supporting telemetry is linked to this record.</p>}</section>
        <section className="process-card"><div className="process-card-title"><AlertTriangle size={18} /><h3>2. DECISION MADE</h3></div>{primaryFault ? <div className="decision-block"><div className="process-row"><span>Finding</span><StatusBadge value={primaryFault.severity} /></div><strong>{primaryFault.faultType}</strong><p>{primaryFault.description}</p><div className="process-row"><span>Fault status</span><StatusBadge value={primaryFault.status} /></div></div> : <p className="process-empty">No fault decision is linked to this record.</p>}{primaryStrategy && <div className="decision-block"><div className="process-row"><span>Selected pathway</span><StatusBadge value={primaryStrategy.approvalStatus} /></div><strong>{primaryStrategy.name}</strong><p>{primaryStrategy.description}</p><small>{primaryStrategy.policyRecommendation || 'No policy recommendation recorded.'}</small></div>}</section>
        <section className="process-card"><div className="process-card-title"><GitBranch size={18} /><h3>3. POSSIBLE PATHWAYS</h3></div>{process.strategyItems.length ? process.strategyItems.map((strategy) => <div className="pathway-item" key={strategy.id}><div><strong>{strategy.name}</strong><p>{strategy.description}</p></div><StatusBadge value={strategy.approvalStatus} /></div>) : <p className="process-empty">No recovery pathway has been recorded for this record.</p>}<p className="process-note">Only recorded proposals are shown. No unrecorded action is treated as an executed command.</p></section>
        <section className="process-card"><div className="process-card-title"><ShieldCheck size={18} /><h3>4. COMPUTATIONAL CORE</h3></div>{process.verificationItems.length ? process.verificationItems.map((verification) => <div className="verification-block" key={verification.id}><div className="process-row"><span>{verification.commandId}</span><StatusBadge value={verification.verificationStatus} /></div><strong>{verification.proposedCommand}</strong><p>{verification.validationResult}</p><small>{verification.verificationMethod} · {formatDate(verification.timestamp)}</small></div>) : <p className="process-empty">Command verification is pending for this process.</p>}<div className="core-checks"><span><CheckCircle2 size={15} /> Schema check: <StatusBadge value={coreStatus} /></span><span><CheckCircle2 size={15} /> Safety boundary: <StatusBadge value={coreStatus} /></span><span><CheckCircle2 size={15} /> Rollback check: <StatusBadge value={coreStatus} /></span></div></section>
        <section className="process-card"><div className="process-card-title"><Cpu size={18} /><h3>5. REPLICATION CORE OUTPUT</h3></div>{process.outcomeItems.length ? process.outcomeItems.map((outcome) => <div className="outcome-block" key={outcome.id}><div className="process-row"><span>Recovery outcome</span><StatusBadge value={outcome.recoveryOutcome} /></div><strong>{outcome.replicationResult || 'Replication result recorded.'}</strong><p>{outcome.diagnosticExplanation || 'No diagnostic explanation recorded.'}</p><div className="process-row"><span>Mission status</span><StatusBadge value={outcome.missionStatus} /></div><div className="process-row"><span>Execution status</span><StatusBadge value={outcome.executionStatus} /></div></div>) : <p className="process-empty">Replication has not produced a recorded outcome yet.</p>}</section>
        <section className="process-card"><div className="process-card-title"><RotateCcw size={18} /><h3>6. ROLLBACK READINESS</h3></div><div className="rollback-status"><StatusBadge value={hasRollbackPath ? 'AVAILABLE_FOR_REVIEW' : 'PENDING_VERIFICATION'} /></div><div className="rollback-detail-row"><span>Command</span><strong className="process-mono">{primaryVerification?.commandId || 'Not assigned'}</strong></div><div className="rollback-detail-row"><span>Verification</span><strong>{primaryVerification?.verificationStatus || 'Not recorded'}</strong></div><div className="rollback-path"><span>Current state</span><b>→</b><span>Checkpoint</span><b>→</b><span>Previous safe state</span></div><p className="process-note">Rollback is shown as readiness/audit state. This system does not claim a spacecraft rollback was executed.</p></section>
      </div>
      <section className="process-card process-timeline-card"><div className="process-card-title"><Clock3 size={18} /><h3>PROCESS TIMELINE</h3></div>{process.timeline.length ? <div className="process-timeline">{process.timeline.map((event, index) => <div className="process-timeline-item" key={`${event.label}-${event.timestamp}-${index}`}><span className={`process-timeline-dot ${event.tone}`}></span><div><strong>{event.label}</strong><p>{event.detail}</p></div><time>{formatDate(event.timestamp)}</time></div>)}</div> : <p className="process-empty">No process events are available.</p>}</section>
    </section>
  );
}
