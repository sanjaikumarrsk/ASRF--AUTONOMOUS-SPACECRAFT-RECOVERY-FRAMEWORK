import React from 'react';
import './DecisionLedger.css';

export const DecisionLedger = ({ 
  events = [
    { time: 'T+00:00', label: 'Telemetry anomaly detected', type: 'detection' },
    { time: 'T+00:04', label: 'LSTM identifies processor instability', type: 'analysis' },
    { time: 'T+00:07', label: 'PPO selects PROCESSOR_RESTART', type: 'decision' },
    { time: 'T+00:10', label: 'Replication Core begins test', type: 'verification' },
    { time: 'T+00:13', label: 'Replication result successful', type: 'verification' },
    { time: 'T+00:15', label: 'Computational Core verification passed', type: 'verification' },
    { time: 'T+00:16', label: 'Rollback verified', type: 'verification' },
    { time: 'T+00:17', label: 'Command authorized', type: 'decision' },
    { time: 'T+00:19', label: 'Recovery confirmed', type: 'execution' },
    { time: 'T+00:20', label: 'Mission continues', type: 'execution' }
  ]
}) => {
  return (
    <div className="decision-ledger">
      <h2 className="section-title">DECISION LEDGER</h2>
      
      <div className="timeline-container">
        {events.map((evt, idx) => (
          <div key={idx} className="timeline-item">
            <div className="timeline-time mono">{evt.time}</div>
            <div className="timeline-marker">
              <div className={`marker-dot type-${evt.type}`}></div>
              {idx < events.length - 1 && <div className="marker-line"></div>}
            </div>
            <div className="timeline-content">
              <span className="timeline-label">{evt.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
