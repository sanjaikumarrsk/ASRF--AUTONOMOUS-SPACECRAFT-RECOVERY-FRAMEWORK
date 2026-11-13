import React, { useState } from 'react';
import { Database, Activity, Brain, ShieldCheck, Play, Server, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import './ArchitectureDiagram.css';

const nodes = [
  { id: 'celestial', label: 'AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK', type: 'source', icon: Server },
  { id: 'telemetry', label: 'TELEMETRY INPUT', type: 'ingest', icon: Activity },
  { id: 'processing', label: 'DATA PROCESSING\nSpark/Scala', type: 'process', icon: Database },
  { id: 'health', label: 'HEALTH MONITOR', type: 'monitor', icon: Activity },
  { id: 'model', label: 'LSTM FAULT MODEL', type: 'ai', icon: Brain },
  { id: 'policy', label: 'PPO POLICY ENGINE', type: 'ai', icon: Zap },
  { id: 'replication', label: 'REPLICATION CORE', type: 'verify', icon: RefreshCw },
  { id: 'evaluation', label: 'OUTCOME EVALUATION', type: 'verify', icon: Activity },
  { id: 'computational', label: 'COMPUTATIONAL CORE', type: 'safety', icon: ShieldCheck },
  { id: 'execution', label: 'EXECUTION', type: 'action', icon: Play },
  { id: 'validation', label: 'EARTH VALIDATION', type: 'action', icon: Database },
  { id: 'continuity', label: 'MISSION CONTINUITY', type: 'outcome', icon: ShieldCheck }
];

const connections = [
  { from: 'celestial', to: 'telemetry' },
  { from: 'telemetry', to: 'processing' },
  { from: 'processing', to: 'health' },
  { from: 'health', to: 'model' },
  { from: 'model', to: 'policy' },
  { from: 'policy', to: 'replication' },
  { from: 'replication', to: 'evaluation' },
  { from: 'evaluation', to: 'computational' },
  { from: 'computational', to: 'execution' },
  { from: 'computational', to: 'validation' },
  { from: 'execution', to: 'continuity' },
  { from: 'validation', to: 'continuity' }
];

const ArchitectureDiagram = () => {
  const [activeNode, setActiveNode] = useState(null);

  const getNodeInfo = (id) => {
    switch (id) {
      case 'celestial': return 'Spacecraft simulated environment';
      case 'telemetry': return 'Raw data ingestion layer';
      case 'processing': return 'High-throughput data cleaning and structuring';
      case 'health': return 'Baseline comparison and anomaly detection';
      case 'model': return 'Predictive fault identification using LSTM networks';
      case 'policy': return 'Reinforcement learning for recovery action selection';
      case 'replication': return 'Digital validation environment for proposed actions';
      case 'evaluation': return 'Success probability and risk assessment';
      case 'computational': return 'Safety constraints and command authorization';
      case 'execution': return 'Command dispatch to simulated spacecraft';
      case 'validation': return 'Ground-in-the-loop secondary validation';
      case 'continuity': return 'Final verified operational state';
      default: return 'System Component';
    }
  };

  return (
    <div className="arch-diagram-container">
      <div className="arch-diagram-header">
        <h2 className="arch-diagram-title">SYSTEM ARCHITECTURE</h2>
        <p className="arch-diagram-subtitle">AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK Autonomous Fault-Recovery Pipeline</p>
      </div>

      <div className="diagram-wrapper">
        <div className="diagram-scroll-container">
          <div className="diagram-layout">
            {nodes.map((node) => {
              const Icon = node.icon;
              return (
                <div 
                  key={node.id} 
                  className={`arch-node type-${node.type} ${activeNode === node.id ? 'active' : ''}`}
                  onClick={() => setActiveNode(node.id === activeNode ? null : node.id)}
                >
                  <Icon className="arch-node-icon" size={24} />
                  <div className="arch-node-label">{node.label}</div>
                  
                  {activeNode === node.id && (
                    <div className="arch-node-popup">
                      <div className="popup-title">{node.label.replace('\n', ' - ')}</div>
                      <div className="popup-desc">{getNodeInfo(node.id)}</div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Visual connecting paths mapping the flex/grid layout conceptually */}
            {/* In a pure CSS flex/grid layout, drawing actual absolute lines between dynamic boxes is tricky,
                so we rely on a structured flow with pseudo-elements as arrows or a grid setup.
                Here we use a flex layout with CSS arrow indicators for a clean scientific look. */}
          </div>
        </div>
      </div>
      <div className="diagram-legend">
        <div className="legend-item"><span className="legend-color type-ingest"></span> Data Ingestion</div>
        <div className="legend-item"><span className="legend-color type-process"></span> Processing</div>
        <div className="legend-item"><span className="legend-color type-ai"></span> AI / ML</div>
        <div className="legend-item"><span className="legend-color type-verify"></span> Verification</div>
        <div className="legend-item"><span className="legend-color type-safety"></span> Safety</div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
