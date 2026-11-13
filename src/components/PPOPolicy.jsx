import React from 'react';
import './PPOPolicy.css';

export const PPOPolicy = ({ 
  stateVector = [],
  candidates = [],
  selectedAction = null,
  confidence = null
}) => {
  return (
    <div className="ppo-policy">
      <div className="sim-label">POLICY PROPOSAL ONLY</div>
      <h2 className="section-title">RECOVERY POLICY ENGINE</h2>
      <div className="model-subtitle">Model: PPO Recovery Policy</div>

      <div className="ppo-layout">
        <div className="state-vector-panel">
          <h3 className="panel-title">State Vector</h3>
          <div className="vector-list">
            {stateVector.map((sv, idx) => (
              <div key={idx} className="vector-item">
                <div className="vector-label">{sv.name}</div>
                <div className="vector-bar-wrap">
                  <div className="vector-bar" style={{ width: `${sv.val * 100}%`, background: sv.val < 0.5 ? '#f59e0b' : '#3b82f6' }}></div>
                </div>
                <div className="vector-val mono">{sv.val.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="action-panel">
          <div className="panel-header-flex">
            <h3 className="panel-title">Candidate Actions</h3>
            <span className="confidence-badge">{confidence == null ? 'No policy inference' : `Confidence: ${confidence}%`}</span>
          </div>
          
          <div className="action-list">
            {candidates.map((cand, idx) => {
              const isSelected = selectedAction != null && cand.action === selectedAction;
              return (
                <div key={idx} className={`action-item ${isSelected ? 'selected' : ''}`}>
                  <div className="action-name mono">{cand.action}</div>
                  <div className="action-prob-wrap">
                    <div className="action-prob-bar" style={{ width: `${cand.prob * 100}%` }}></div>
                  </div>
                  <div className="action-val mono">{(cand.prob * 100).toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="policy-note">
        <strong>NOTE:</strong> No PPO model is connected in this repository. Any policy output must remain a proposal and cannot execute a spacecraft command.
      </div>
    </div>
  );
};
