import React, { useState } from 'react';
import { BrainCircuit, RefreshCw, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import './AiInsights.css';

export default function AiInsights({ telemetry, fault, strategies = [] }) {
  const [kind, setKind] = useState('telemetry-analysis');
  const [state, setState] = useState({ loading: false, result: null, error: null });

  const runAnalysis = async () => {
    setState({ loading: true, result: null, error: null });
    try {
      const result = await api.post(`/ai/${kind}`, {
        task: kind === 'fault-explanation' ? 'Explain the selected fault' : 'Summarize current operational evidence',
        faultId: fault?.id || null,
        telemetryContext: JSON.stringify(telemetry || []),
        strategyContext: JSON.stringify(strategies || []),
      });
      setState({ loading: false, result, error: null });
    } catch (error) {
      setState({ loading: false, result: null, error: error.message });
    }
  };

  return (
    <div className="ai-insights">
      <div className="ai-insights__header">
        <div>
          <div className="sim-label">OPTIONAL PROVIDER-BACKED ANALYSIS</div>
          <h2 className="section-title"><BrainCircuit size={18} /> AI TELEMETRY INSIGHTS</h2>
        </div>
        <span className="ai-insights__safety"><ShieldAlert size={15} /> Proposal / explanation only</span>
      </div>
      <div className="ai-insights__controls">
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="telemetry-analysis">Telemetry analysis</option>
          <option value="fault-explanation">Fault explanation</option>
          <option value="recovery-recommendations">Recovery recommendations</option>
        </select>
        <button type="button" onClick={runAnalysis} disabled={state.loading || (!telemetry?.length && !fault)}>
          <RefreshCw size={15} className={state.loading ? 'spin' : ''} />
          {state.loading ? 'Analyzing…' : 'Run analysis'}
        </button>
      </div>
      {state.error && <p className="ai-insights__message error">{state.error}</p>}
      {state.result && (
        <div className={`ai-insights__result ${state.result.available ? '' : 'unavailable'}`}>
          <strong>{state.result.available ? 'AI response' : 'AI unavailable'}</strong>
          <p>{state.result.content || state.result.message}</p>
        </div>
      )}
      {!state.result && !state.error && <p className="ai-insights__message">No AI result requested. The deterministic dashboard remains available without provider credentials.</p>}
    </div>
  );
}
