import React, { useState } from 'react';
import { Settings, Cpu, Thermometer, Zap, Radio, Activity, LayoutTemplate, ActivitySquare } from 'lucide-react';
import './ReplicationCore.css';

const defaultModels = {
  power: { current: '84.2W', predicted: '82.1W', margin: '+12.8W', status: 'STABLE' },
  thermal: { current: '67.4°C', predicted: '61.8°C', margin: '+18.2°C', status: 'STABLE' },
  compute: { current: '43%', predicted: '38%', margin: '+42%', status: 'NOMINAL' },
  communication: { delay: '12.8s', predicted: '12.4s', quality: '94%', status: 'NOMINAL' },
  health: { overall: '96%', predicted: '97%', status: 'HEALTHY' },
  mission: { phase: 'NOMINAL', continuity: 'ASSURED', risk: 'LOW' }
};

const ReplicationCore = ({ testData, modelComponents = defaultModels, isExpanded = true }) => {
  const [activeNode, setActiveNode] = useState(null);

  const nodes = [
    { id: 'telemetry', label: 'CURRENT TELEMETRY', icon: Activity, desc: 'Real-time state ingestion from spacecraft systems.' },
    { id: 'sync', label: 'STATE SYNCHRONIZATION', icon: ActivitySquare, desc: 'Aligning physical and replica states.' },
    { id: 'replica', label: 'REPLICA STATE', icon: LayoutTemplate, desc: 'Synchronized baseline state for simulation.' },
    { id: 'models', label: 'SYSTEM MODELS', icon: Settings, desc: 'Power, Thermal, and CPU behavioral models.' },
    { id: 'fault', label: 'FAULT INJECTION', icon: Zap, desc: 'Injecting hypothesized fault conditions.' },
    { id: 'recovery', label: 'RECOVERY ACTION', icon: Cpu, desc: 'Applying candidate recovery sequence.' },
    { id: 'sim', label: 'SIMULATION', icon: Activity, desc: 'Running forward-time behavioral simulation.' },
    { id: 'eval', label: 'OUTCOME EVALUATION', icon: ActivitySquare, desc: 'Assessing simulation results against safety bounds.' },
    { id: 'conf', label: 'CONFIDENCE/RISK', icon: LayoutTemplate, desc: 'Calculating probability of success and risk vectors.' },
    { id: 'comp', label: 'COMPUTATIONAL CORE', icon: Cpu, desc: 'Forwarding validated plan for final authorization.' }
  ];

  return (
    <div className="rep-core-container">
      <div className="rep-core-header">
        <h2 className="rep-core-title">REPLICATION CORE</h2>
        <p className="rep-core-subtitle">Pre-execution recovery validation environment</p>
        <p className="rep-core-desc">
          The Replication Core provides a synchronized simulated spacecraft state in which candidate recovery actions are evaluated before execution.
        </p>
      </div>

      <div className="rep-core-section">
        <h3 className="section-title">Model Circuit Diagram</h3>
        <div className="circuit-container">
          <div className="circuit-diagram">
            {nodes.map((node, i) => (
              <React.Fragment key={node.id}>
                <div 
                  className={`circuit-node ${activeNode === node.id ? 'active' : ''}`}
                  onClick={() => setActiveNode(node.id)}
                >
                  <node.icon size={20} className="node-icon" />
                  <span className="node-label">{node.label}</span>
                </div>
                {i < nodes.length - 1 && <div className="circuit-line" />}
              </React.Fragment>
            ))}
          </div>

          {activeNode && (
            <div className="node-detail-panel">
              <h4>{nodes.find(n => n.id === activeNode).label}</h4>
              <p>{nodes.find(n => n.id === activeNode).desc}</p>
              <div className="detail-meta">
                <span>Status: <strong>ACTIVE</strong></span>
                <span>Processing: <strong>NOMINAL</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2-col">
        <div className="rep-core-section">
          <h3 className="section-title">Simulated Test Results</h3>
          <div className="results-card">
            <div className="result-row"><span className="result-label">TEST ID:</span> <span className="monospace font-bold text-blue-800">REP-2026-0841</span></div>
            <div className="result-row"><span className="result-label">Candidate Action:</span> <span className="monospace">PROCESSOR_RESTART</span></div>
            <div className="result-row"><span className="result-label">Simulation Duration:</span> <span>3.0s</span></div>
            <div className="result-row"><span className="result-label">Thermal Response:</span> <span className="text-green-600 font-bold">STABLE</span></div>
            <div className="result-row"><span className="result-label">Power Response:</span> <span className="text-green-600 font-bold">ACCEPTABLE</span></div>
            <div className="result-row"><span className="result-label">Subsystem Recovery:</span> <span className="text-green-600 font-bold">SUCCESS</span></div>
            <div className="result-row"><span className="result-label">Mission Continuity:</span> <span className="text-green-600 font-bold">PRESERVED</span></div>
            <div className="result-row"><span className="result-label">Outcome Confidence:</span> <span className="text-blue-600 font-bold">93.7%</span></div>
            <div className="result-row"><span className="result-label">Risk:</span> <span className="text-green-600 font-bold">LOW</span></div>
            <div className="result-recommendation">
              <span className="result-label block mb-1">Recommendation:</span> 
              <span className="recommendation-badge">PROCEED TO COMPUTATIONAL CORE</span>
            </div>
          </div>
        </div>

        <div className="rep-core-section">
          <h3 className="section-title">Model Components</h3>
          <div className="models-grid">
            <div className="model-card">
              <div className="model-header"><Zap size={16}/> <span>POWER MODEL</span></div>
              <div className="model-stats">
                <div><span>Current</span> <strong>{modelComponents.power.current}</strong></div>
                <div><span>Predicted</span> <strong>{modelComponents.power.predicted}</strong></div>
                <div><span>Margin</span> <strong>{modelComponents.power.margin}</strong></div>
                <div className="status-indicator success">{modelComponents.power.status}</div>
              </div>
            </div>
            
            <div className="model-card">
              <div className="model-header"><Thermometer size={16}/> <span>THERMAL MODEL</span></div>
              <div className="model-stats">
                <div><span>Current</span> <strong>{modelComponents.thermal.current}</strong></div>
                <div><span>Predicted</span> <strong>{modelComponents.thermal.predicted}</strong></div>
                <div><span>Margin</span> <strong>{modelComponents.thermal.margin}</strong></div>
                <div className="status-indicator success">{modelComponents.thermal.status}</div>
              </div>
            </div>

            <div className="model-card">
              <div className="model-header"><Cpu size={16}/> <span>COMPUTE MODEL</span></div>
              <div className="model-stats">
                <div><span>Current</span> <strong>{modelComponents.compute.current}</strong></div>
                <div><span>Predicted</span> <strong>{modelComponents.compute.predicted}</strong></div>
                <div><span>Margin</span> <strong>{modelComponents.compute.margin}</strong></div>
                <div className="status-indicator success">{modelComponents.compute.status}</div>
              </div>
            </div>

            <div className="model-card">
              <div className="model-header"><Radio size={16}/> <span>COMMUNICATION MODEL</span></div>
              <div className="model-stats">
                <div><span>Delay</span> <strong>{modelComponents.communication.delay}</strong></div>
                <div><span>Predicted</span> <strong>{modelComponents.communication.predicted}</strong></div>
                <div><span>Quality</span> <strong>{modelComponents.communication.quality}</strong></div>
                <div className="status-indicator success">{modelComponents.communication.status}</div>
              </div>
            </div>
            
            <div className="model-card">
              <div className="model-header"><Activity size={16}/> <span>SUBSYSTEM HEALTH</span></div>
              <div className="model-stats">
                <div><span>Overall</span> <strong>{modelComponents.health.overall}</strong></div>
                <div><span>Predicted</span> <strong>{modelComponents.health.predicted}</strong></div>
                <div className="status-indicator success">{modelComponents.health.status}</div>
              </div>
            </div>
            
            <div className="model-card">
              <div className="model-header"><LayoutTemplate size={16}/> <span>MISSION STATE</span></div>
              <div className="model-stats">
                <div><span>Phase</span> <strong>{modelComponents.mission.phase}</strong></div>
                <div><span>Continuity</span> <strong>{modelComponents.mission.continuity}</strong></div>
                <div className="status-indicator success">{modelComponents.mission.risk} RISK</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplicationCore;
