import React from 'react';
import './LSTMAnalysis.css';

export const LSTMAnalysis = ({ analysis }) => {
  if (!analysis) {
    return <div className="lstm-analysis"><div className="sim-label">MODEL NOT CONNECTED</div><h2 className="section-title">TEMPORAL FAULT ANALYSIS</h2><p>No LSTM inference service is configured. Fault records shown by the dashboard come from auditable deterministic thresholds.</p></div>;
  }
  return (
    <div className="lstm-analysis">
      <div className="header-group">
        <div className="sim-label">MODEL INFERENCE STATUS</div>
        <h2 className="section-title">TEMPORAL FAULT ANALYSIS</h2>
      </div>

      <div className="model-info">
        <span className="badge">LSTM Fault Analyzer</span>
        <span className="badge outline">Input: Telemetry Sequence</span>
        <span className="badge outline">60 samples, 24 features</span>
      </div>

      <div className="pipeline-flow">
        {['RAW TELEMETRY', 'DATA NORMALIZATION', 'WINDOWING', 'FEATURE EXTRACTION', 'TEMPORAL SEQUENCE', 'LSTM ANALYSIS', 'ANOMALY SCORE', 'FAULT CLASSIFICATION', 'CONFIDENCE'].map((step, i) => (
          <React.Fragment key={i}>
            <div className="flow-step">{step}</div>
            {i < 8 && <div className="flow-arrow">→</div>}
          </React.Fragment>
        ))}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">Sequence Length</div>
          <div className="metric-val mono">{analysis.sequenceLength}</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-header">Anomaly Score</div>
          <div className="metric-val mono">{analysis.anomalyScore.toFixed(2)}</div>
          <div className="bar-bg">
            <div className="bar-fill" style={{ width: `${analysis.anomalyScore * 100}%`, background: `linear-gradient(90deg, #16a34a, #dc2626)` }}></div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Fault Probability</div>
          <div className="metric-val mono">{analysis.faultProbability.toFixed(2)}</div>
          <div className="bar-bg">
            <div className="bar-fill" style={{ width: `${analysis.faultProbability * 100}%`, background: `linear-gradient(90deg, #16a34a, #dc2626)` }}></div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Root Cause Confidence</div>
          <div className="metric-val mono">{analysis.rootCauseConfidence.toFixed(1)}%</div>
          <div className="bar-bg">
            <div className="bar-fill" style={{ width: `${analysis.rootCauseConfidence}%`, background: `linear-gradient(90deg, #dc2626, #16a34a)` }}></div>
          </div>
        </div>
      </div>

      <div className="detected-pattern">
        <span className="pattern-label">Detected Pattern:</span>
        <span className="pattern-value">{analysis.detectedPattern}</span>
      </div>
    </div>
  );
};
