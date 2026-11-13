import React from 'react';
import './OperationalAudit.css';

const valueOrDash = (value) => value || '—';

export default function OperationalAudit({ strategies = [], verifications = [], outcomes = [] }) {
  return (
    <div className="operational-audit">
      <div className="audit-card"><span>Recovery proposals</span><strong>{strategies.length}</strong><small>Not commands</small></div>
      <div className="audit-card"><span>Command verifications</span><strong>{verifications.length}</strong><small>Stored evidence</small></div>
      <div className="audit-card"><span>Recorded outcomes</span><strong>{outcomes.length}</strong><small>Trusted integration only</small></div>
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th>Type</th><th>Identifier</th><th>Status</th><th>Execution boundary</th></tr></thead>
          <tbody>
            {strategies.slice(0, 4).map((item) => <tr key={`strategy-${item.id}`}><td>Strategy</td><td>{item.id}</td><td>{item.approvalStatus}</td><td>Proposal only</td></tr>)}
            {verifications.slice(0, 4).map((item) => <tr key={`verification-${item.id}`}><td>Verification</td><td>{valueOrDash(item.commandId)}</td><td>{item.verificationStatus}</td><td>Does not execute</td></tr>)}
            {outcomes.slice(0, 4).map((item) => <tr key={`outcome-${item.id}`}><td>Outcome</td><td>{item.id}</td><td>{item.executionStatus}</td><td>{item.executionStatus === 'NOT_EXECUTED' ? 'No executor connected' : 'External evidence required'}</td></tr>)}
            {!strategies.length && !verifications.length && !outcomes.length && <tr><td colSpan="4" className="audit-empty">No recovery audit records are stored.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
