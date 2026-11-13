import React, { useState } from 'react';
import './System.css';
import Sidebar from '../components/Sidebar';
import { COMPONENTS_25 } from '../data/components25';
import {
  Layers, Network, Cpu, ShieldCheck, Database, Radio,
  Activity, ArrowRight, Zap, Thermometer, X, Search,
  CheckCircle, RefreshCw, AlertTriangle
} from 'lucide-react';

const SUBSYSTEM_FILTERS = [
  { id: 'ALL', label: 'All Components (25)' },
  { id: 'Navigation', label: 'Navigation (2)' },
  { id: 'Science', label: 'Science (8)' },
  { id: 'Mobility', label: 'Mobility (2)' },
  { id: 'Power', label: 'Power (4)' },
  { id: 'Communication', label: 'Communication (3)' },
  { id: 'Thermal', label: 'Thermal (1)' },
  { id: 'Environment', label: 'Environment (3)' },
  { id: 'Control', label: 'Control (2)' }
];

export default function System() {
  const [viewMode, setViewMode] = useState('components'); // 'components' | 'architecture'
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompModal, setSelectedCompModal] = useState(null);

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedCompModal(null);
    };
    if (selectedCompModal) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompModal]);

  // Filter 25 components
  const filteredComponents = COMPONENTS_25.filter((comp) => {
    const matchesFilter = selectedFilter === 'ALL' || comp.subsystem.toLowerCase() === selectedFilter.toLowerCase();
    const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          comp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          comp.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="asrf-system-layout">
      {/* ─── Dark Navy Sidebar ─── */}
      <Sidebar />

      {/* ─── Main Workspace ─── */}
      <div className="asrf-system-main">
        {/* Header */}
        <header className="asrf-system-header">
          <div>
            <h1 className="asrf-system-title">System Architecture</h1>
            <p className="asrf-system-subtitle">Hardware components and subsystem overview</p>
          </div>

          <div className="asrf-system-toggles">
            <button
              type="button"
              className={`asrf-toggle-btn ${viewMode === 'components' ? 'active' : ''}`}
              onClick={() => setViewMode('components')}
            >
              <Layers size={15} />
              <span>Components (25)</span>
            </button>

            <button
              type="button"
              className={`asrf-toggle-btn ${viewMode === 'architecture' ? 'active' : ''}`}
              onClick={() => setViewMode('architecture')}
            >
              <Network size={15} />
              <span>Architecture</span>
            </button>
          </div>
        </header>

        {/* ─── VIEW A: 25 HARDWARE COMPONENTS ─── */}
        {viewMode === 'components' && (
          <div className="asrf-components-view-layout">
            {/* Filter Pills Sidebar/Pills */}
            <aside className="asrf-filter-sidebar">
              <div className="asrf-search-box">
                <Search size={14} className="asrf-search-icon" />
                <input
                  type="text"
                  placeholder="Filter components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="asrf-filter-search-input"
                />
              </div>

              <div className="asrf-filter-pills-list">
                {SUBSYSTEM_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`asrf-filter-pill-btn ${selectedFilter === f.id ? 'active' : ''}`}
                    onClick={() => setSelectedFilter(f.id)}
                  >
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Components Grid */}
            <main className="asrf-components-catalog-content">
              <div className="asrf-sys-comp-grid">
                {filteredComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className="asrf-sys-card"
                    onClick={() => setSelectedCompModal(comp)}
                  >
                    <div className="asrf-sys-img-container">
                      <img
                        src={comp.image}
                        alt={comp.name}
                        className="asrf-sys-img"
                        loading="lazy"
                      />
                      <span className="asrf-sys-badge">{comp.subsystem}</span>
                    </div>

                    <div className="asrf-sys-card-body">
                      <div className="asrf-sys-card-id">{comp.id}</div>
                      <h4 className="asrf-sys-card-title">{comp.name}</h4>
                      <p className="asrf-sys-card-desc">{comp.description}</p>
                      <div className="asrf-sys-card-meta">
                        <span className="asrf-sys-health-tag">
                          <CheckCircle size={12} className="inline mr-1" /> Health: {comp.health}%
                        </span>
                        <span className="asrf-sys-inspect-link">View Specs &rarr;</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          </div>
        )}

        {/* ─── VIEW B: ARCHITECTURE FLOW & DATA PIPELINES ─── */}
        {viewMode === 'architecture' && (
          <div className="asrf-arch-view-container">
            {/* 1. Closed Loop Flow */}
            <section className="asrf-arch-card">
              <h2 className="asrf-arch-heading">Closed-Loop Autonomous Recovery Architecture</h2>
              <p className="asrf-arch-desc">
                High-throughput telemetry ingestion, temporal AI anomaly detection, PPO recovery planning,
                hardware-in-the-loop simulation validation, and deterministic formal command verification.
              </p>

              <div className="asrf-arch-pipeline-strip">
                <div className="asrf-pipeline-node">
                  <span className="asrf-node-step">1</span>
                  <Radio size={20} className="asrf-node-icon" />
                  <span className="asrf-node-title">SPACECRAFT TELEMETRY</span>
                  <span className="asrf-node-sub">1553B / SpaceWire 10Hz</span>
                </div>
                <ArrowRight size={18} className="asrf-pipeline-arrow" />

                <div className="asrf-pipeline-node">
                  <span className="asrf-node-step">2</span>
                  <Database size={20} className="asrf-node-icon" />
                  <span className="asrf-node-title">SPARK + SCALA</span>
                  <span className="asrf-node-sub">Micro-batch Processing</span>
                </div>
                <ArrowRight size={18} className="asrf-pipeline-arrow" />

                <div className="asrf-pipeline-node">
                  <span className="asrf-node-step">3</span>
                  <Cpu size={20} className="asrf-node-icon" />
                  <span className="asrf-node-title">LSTM INFERENCE</span>
                  <span className="asrf-node-sub">Temporal Anomaly Engine</span>
                </div>
                <ArrowRight size={18} className="asrf-pipeline-arrow" />

                <div className="asrf-pipeline-node highlight">
                  <span className="asrf-node-step">4</span>
                  <Activity size={20} className="asrf-node-icon" />
                  <span className="asrf-node-title">PPO RECOVERY POLICY</span>
                  <span className="asrf-node-sub">Candidate Action Selector</span>
                </div>
                <ArrowRight size={18} className="asrf-pipeline-arrow" />

                <div className="asrf-pipeline-node">
                  <span className="asrf-node-step">5</span>
                  <RefreshCw size={20} className="asrf-node-icon" />
                  <span className="asrf-node-title">REPLICATION CORE</span>
                  <span className="asrf-node-sub">Digital Twin Sandbox</span>
                </div>
                <ArrowRight size={18} className="asrf-pipeline-arrow" />

                <div className="asrf-pipeline-node">
                  <span className="asrf-node-step">6</span>
                  <ShieldCheck size={20} className="asrf-node-icon" />
                  <span className="asrf-node-title">COMPUTE CORE</span>
                  <span className="asrf-node-sub">Deterministic Lock</span>
                </div>
              </div>
            </section>

            {/* 2. Core Pillars Details */}
            <div className="asrf-arch-details-grid">
              <div className="asrf-arch-detail-card">
                <div className="asrf-detail-badge-icon asrf-badge--blue">
                  <Cpu size={18} />
                </div>
                <h3 className="asrf-detail-title">LSTM Temporal Anomaly Detection</h3>
                <p className="asrf-detail-text">
                  Ingests sequential telemetry windows (30 consecutive 1Hz timesteps). Recognizes multi-parameter
                  cross-correlations to detect thermal latchup, sensor bias drift, and voltage degradation prior to critical failure.
                </p>
                <div className="asrf-metric-tag">Detection Latency: &lt; 250ms</div>
              </div>

              <div className="asrf-arch-detail-card">
                <div className="asrf-detail-badge-icon asrf-badge--green">
                  <Activity size={18} />
                </div>
                <h3 className="asrf-detail-title">PPO Reinforcement Policy</h3>
                <p className="asrf-detail-text">
                  Evaluates candidate recovery procedures across safety reward functions. Optimizes vehicle integrity,
                  continuity of science payload operations, and minimal power disruption without manual ground command.
                </p>
                <div className="asrf-metric-tag">Policy Confidence: 99.4%</div>
              </div>

              <div className="asrf-arch-detail-card">
                <div className="asrf-detail-badge-icon asrf-badge--purple">
                  <RefreshCw size={18} />
                </div>
                <h3 className="asrf-detail-title">Replication Core Digital Twin</h3>
                <p className="asrf-detail-text">
                  Simulates candidate commands inside an isolated hardware-in-the-loop virtual environment before hardware bus uplink.
                  Verifies post-execution stability and arms automated state-space rollback snapshots.
                </p>
                <div className="asrf-metric-tag">Simulation Speed: 10x Physics</div>
              </div>

              <div className="asrf-arch-detail-card">
                <div className="asrf-detail-badge-icon asrf-badge--amber">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="asrf-detail-title">Computational Core Verification</h3>
                <p className="asrf-detail-text">
                  Mathematically proves command syntax, constraint bounds, and inter-subsystem safety invariants using formal grammar.
                  Blocks unauthorized commands from ever accessing flight physical effectors.
                </p>
                <div className="asrf-metric-tag">Formal Grammar: CCSDS-1553B</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedCompModal && (
        <div className="asrf-modal-backdrop" onClick={() => setSelectedCompModal(null)}>
          <div className="asrf-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="asrf-modal-header">
              <div>
                <span className="asrf-modal-eyebrow">{selectedCompModal.id}</span>
                <h3 className="asrf-modal-title">{selectedCompModal.name}</h3>
              </div>
              <button
                className="asrf-modal-close"
                onClick={() => setSelectedCompModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="asrf-modal-body">
              <div className="asrf-modal-img-box">
                <img
                  src={selectedCompModal.image}
                  alt={selectedCompModal.name}
                  className="asrf-modal-img"
                />
              </div>

              <div className="asrf-modal-details">
                <div className="asrf-detail-row">
                  <span className="asrf-detail-label">Subsystem:</span>
                  <span className="asrf-detail-value">{selectedCompModal.subsystem}</span>
                </div>
                <div className="asrf-detail-row">
                  <span className="asrf-detail-label">Technical Function:</span>
                  <span className="asrf-detail-value">{selectedCompModal.operating_purpose}</span>
                </div>
                <div className="asrf-detail-row">
                  <span className="asrf-detail-label">Redundancy Setup:</span>
                  <span className="asrf-detail-value">{selectedCompModal.redundancy_type}</span>
                </div>
                <div className="asrf-detail-row">
                  <span className="asrf-detail-label">Nominal Operating Range:</span>
                  <span className="asrf-detail-value font-mono">
                    {selectedCompModal.normal_range_min} - {selectedCompModal.normal_range_max} {selectedCompModal.unit}
                  </span>
                </div>
                <div className="asrf-detail-row">
                  <span className="asrf-detail-label">Autonomous Safety Boundary:</span>
                  <span className="asrf-detail-value font-mono text-red">
                    {selectedCompModal.critical_threshold} {selectedCompModal.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
