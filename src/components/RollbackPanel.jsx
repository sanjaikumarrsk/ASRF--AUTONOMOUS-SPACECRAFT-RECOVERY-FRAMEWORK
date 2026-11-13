import React from 'react';
import { ArrowRight, CheckCircle, Clock } from 'lucide-react';
import './RollbackPanel.css';

export const RollbackPanel = ({ 
  rollback = {
    status: 'AVAILABLE',
    commandId: 'RB-PRC-042',
    estimatedRecovery: '8.4s',
    verification: 'PASSED'
  } 
}) => {
  return (
    <div className="rollback-panel">
      <div className="rollback-header">
        <h2 className="section-title m-0">ROLLBACK & RECOVERY</h2>
        <div className="status-badge available">{rollback.status}</div>
      </div>
      
      <div className="rollback-grid">
        <div className="rb-info-box">
          <div className="rb-label">Command ID</div>
          <div className="rb-val mono">{rollback.commandId}</div>
        </div>
        <div className="rb-info-box">
          <div className="rb-label">Est. Recovery Time</div>
          <div className="rb-val mono flex-align"><Clock size={16} /> {rollback.estimatedRecovery}</div>
        </div>
        <div className="rb-info-box">
          <div className="rb-label">Verification</div>
          <div className="rb-val success flex-align"><CheckCircle size={16} /> {rollback.verification}</div>
        </div>
      </div>

      <div className="reversal-path">
        <div className="rb-label mb-2">Reversal Path Visualization</div>
        <div className="path-viz">
          <div className="path-node fault">Processor Restart</div>
          <div className="path-arrow"><ArrowRight size={18} /></div>
          <div className="path-node intermediate">State Checkpoint Alpha</div>
          <div className="path-arrow"><ArrowRight size={18} /></div>
          <div className="path-node safe">Previous Operating State</div>
        </div>
      </div>
    </div>
  );
};
