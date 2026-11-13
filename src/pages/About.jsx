import React from 'react';
import './About.css';
import Sidebar from '../components/Sidebar';
import {
  Cpu, RefreshCw, Layers, ShieldCheck, Orbit, Database, Radio,
  Activity, CheckCircle2, ChevronRight, Server, FileText, Globe,
  ArrowRight, HardDrive, Network, Check, Sparkles, BarChart2
} from 'lucide-react';

export default function About() {
  return (
    <div className="asrf-about-layout">
      {/* ─── Dark Navy Sidebar ─── */}
      <Sidebar />

      {/* ─── Main Workspace ─── */}
      <div className="asrf-about-main">
        {/* Top Header */}
        <header className="asrf-about-topbar">
          <div>
            <h1 className="asrf-about-title">About the Project</h1>
            <p className="asrf-about-subtitle">
              Project overview, system workflow and technology details
            </p>
          </div>
          <div className="asrf-about-top-right">
            <span className="asrf-sim-pill">
              <span className="asrf-sim-dot-green" />
              SIMULATION MODE
            </span>
            <div className="asrf-user-initial">R</div>
          </div>
        </header>

        {/* ─── Row 1: Dual Overview Hero Cards ─── */}
        <section className="asrf-about-row-hero">
          {/* Left Dark Blue Banner */}
          <div className="asrf-hero-left-banner">
            <div className="asrf-banner-content">
              <span className="asrf-banner-tag">AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK (ASRF)</span>
              <p className="asrf-banner-lead">
                An AI-driven framework for real-time telemetry monitoring, fault detection and autonomous recovery of spacecraft and planetary rovers.
              </p>
            </div>
            <div className="asrf-banner-rover-crop">
              <img
                src="/assets/about-rover-hero.jpg"
                alt="Mars Rover Onboard"
                className="asrf-banner-img"
              />
            </div>
          </div>

          {/* Right White Project Overview Card */}
          <div className="asrf-hero-right-card">
            <div className="asrf-card-head-row">
              <div className="asrf-icon-circle blue">
                <TargetIcon size={18} />
              </div>
              <h3 className="asrf-card-h3">Project Overview</h3>
            </div>
            <p className="asrf-card-body-text">
              ASRF continuously monitors spacecraft and planetary rover telemetry, detects faults using LSTM, plans recovery using PPO, validates actions through a Replication Core and Computational Core, and ensures safe command execution for mission continuity.
            </p>
            <div className="asrf-checklist-grid">
              <div className="asrf-check-item">
                <span className="asrf-check-circle"><Check size={11} strokeWidth={3} /></span>
                <span>Real-time telemetry monitoring</span>
              </div>
              <div className="asrf-check-item">
                <span className="asrf-check-circle"><Check size={11} strokeWidth={3} /></span>
                <span>Autonomous recovery (PPO)</span>
              </div>
              <div className="asrf-check-item">
                <span className="asrf-check-circle"><Check size={11} strokeWidth={3} /></span>
                <span>AI-based fault detection (LSTM)</span>
              </div>
              <div className="asrf-check-item">
                <span className="asrf-check-circle"><Check size={11} strokeWidth={3} /></span>
                <span>Safe and validated execution</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Row 2: 9-Stage System Workflow Strip ─── */}
        <section className="asrf-about-section-card">
          <div className="asrf-sec-title-row">
            <Layers size={16} className="text-blue" />
            <h3 className="asrf-sec-h3">System Workflow</h3>
          </div>

          <div className="asrf-workflow-strip">
            <div className="asrf-wf-node">
              <Radio size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">Space Probe<br />Hardware & Sensors</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node">
              <Layers size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">Telemetry<br />Acquisition</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node highlight">
              <Network size={16} className="asrf-wf-icon text-orange" />
              <span className="asrf-wf-lbl">Telemetry Processing<br />(Scala + Spark)</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node">
              <Cpu size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">LSTM<br />Fault Detection</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node">
              <Activity size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">PPO<br />Recovery Planning</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node">
              <RefreshCw size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">Replication<br />Core Testing</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node">
              <ShieldCheck size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">Computational<br />Core Verification</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node">
              <Orbit size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">Authorized<br />Recovery Execution</span>
            </div>
            <ArrowRight size={14} className="asrf-wf-arrow" />

            <div className="asrf-wf-node">
              <BarChart2 size={16} className="asrf-wf-icon" />
              <span className="asrf-wf-lbl">Post-Recovery<br />Monitoring</span>
            </div>
          </div>
        </section>

        {/* ─── Row 3: Dual Telemetry Processing Roles (Space Probe vs Earth Station) + Core Modules ─── */}
        <section className="asrf-about-dual-roles-grid">
          {/* Main 2-column Processing Section */}
          <div className="asrf-dual-roles-main">
            {/* Role 1: Space Probe Side */}
            <div className="asrf-role-box">
              <div className="asrf-role-box-head">
                <Radio size={16} className="text-blue" />
                <div>
                  <h4 className="asrf-role-box-h4">Telemetry Processing – Space Probe Side</h4>
                  <p className="asrf-role-box-sub">Onboard telemetry processing for real-time analysis and fault preparation.</p>
                </div>
              </div>

              <div className="asrf-role-visual-flow">
                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box">
                    <img src="/assets/components_25/navigation_camera_hw.jpg" alt="Sensors" className="asrf-tiny-thumb" />
                  </div>
                  <span>Space Probe<br />Sensors</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box"><Radio size={16} /></div>
                  <span>Telemetry<br />Acquisition</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step processing">
                  <div className="asrf-flow-logo-card">
                    <span className="text-red font-bold font-mono">Scala</span>
                    <span className="text-slate-400">+</span>
                    <img src="/assets/apache-spark.svg" alt="Spark" className="asrf-mini-spark" />
                  </div>
                  <span>Processing<br />(Scala + Spark)</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box"><Database size={16} /></div>
                  <span>Processed<br />Telemetry</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box"><Cpu size={16} /></div>
                  <span>LSTM<br />Fault Analysis</span>
                </div>
              </div>

              <div className="asrf-role-workflow-text">
                <strong>Workflow:</strong> Space Probe Sensors &rarr; Telemetry Acquisition &rarr; Scala + Apache Spark Processing &rarr; Processed Telemetry &rarr; LSTM Fault Analysis
              </div>
            </div>

            {/* Role 2: Earth Station Side */}
            <div className="asrf-role-box">
              <div className="asrf-role-box-head">
                <Globe size={16} className="text-blue" />
                <div>
                  <h4 className="asrf-role-box-h4">Telemetry Processing – Earth Station Side</h4>
                  <p className="asrf-role-box-sub">Ground-based processing of received telemetry for monitoring and analysis.</p>
                </div>
              </div>

              <div className="asrf-role-visual-flow">
                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box"><Orbit size={16} /></div>
                  <span>Space<br />Probe</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box"><Radio size={16} /></div>
                  <span>Telemetry<br />Transmission</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box">
                    <img src="/assets/earth-station-dish.jpg" alt="DSN" className="asrf-tiny-thumb" />
                  </div>
                  <span>Earth Station<br />Reception</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step processing">
                  <div className="asrf-flow-logo-card">
                    <span className="text-red font-bold font-mono">Scala</span>
                    <span className="text-slate-400">+</span>
                    <img src="/assets/apache-spark.svg" alt="Spark" className="asrf-mini-spark" />
                  </div>
                  <span>Processing<br />(Scala + Spark)</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box"><Database size={16} /></div>
                  <span>Structured<br />Telemetry Data</span>
                </div>
                <ArrowRight size={12} className="asrf-flow-arr" />

                <div className="asrf-flow-step">
                  <div className="asrf-flow-icon-box"><BarChart2 size={16} /></div>
                  <span>Monitoring<br />and Analysis</span>
                </div>
              </div>

              <div className="asrf-role-workflow-text">
                <strong>Workflow:</strong> Space Probe &rarr; Telemetry Transmission &rarr; Earth Station Reception &rarr; Scala + Apache Spark Processing &rarr; Structured Telemetry Data &rarr; Monitoring and Analysis
              </div>
            </div>
          </div>

          {/* Right Sidebar: Other Core Modules */}
          <aside className="asrf-other-modules-card">
            <div className="asrf-card-head-row">
              <div className="asrf-icon-circle purple"><Cpu size={16} /></div>
              <h4 className="asrf-card-h4">Other Core Modules</h4>
            </div>

            <div className="asrf-modules-list">
              <div className="asrf-mod-item">
                <div className="asrf-mod-head">
                  <span className="asrf-mod-icon-tag"><Activity size={12} /></span>
                  <span className="asrf-mod-name">LSTM – Fault Detection</span>
                </div>
                <p className="asrf-mod-text">Analyses processed telemetry to detect abnormal behaviour and classify faults.</p>
              </div>

              <div className="asrf-mod-item">
                <div className="asrf-mod-head">
                  <span className="asrf-mod-icon-tag"><BrainIcon size={12} /></span>
                  <span className="asrf-mod-name">PPO – Recovery Planning</span>
                </div>
                <p className="asrf-mod-text">Evaluates candidate recovery actions and selects the optimal action.</p>
              </div>

              <div className="asrf-mod-item">
                <div className="asrf-mod-head">
                  <span className="asrf-mod-icon-tag"><Layers size={12} /></span>
                  <span className="asrf-mod-name">Replication Core</span>
                </div>
                <p className="asrf-mod-text">Tests candidate recovery actions in a simulated environment before execution.</p>
              </div>

              <div className="asrf-mod-item">
                <div className="asrf-mod-head">
                  <span className="asrf-mod-icon-tag"><ShieldCheck size={12} /></span>
                  <span className="asrf-mod-name">Computational Core</span>
                </div>
                <p className="asrf-mod-text">Validates commands against safety constraints and authorizes execution.</p>
              </div>

              <div className="asrf-mod-item">
                <div className="asrf-mod-head">
                  <span className="asrf-mod-icon-tag"><BarChart2 size={12} /></span>
                  <span className="asrf-mod-name">Mission Continuity</span>
                </div>
                <p className="asrf-mod-text">Ensures safe recovery and continued mission operations.</p>
              </div>
            </div>
          </aside>
        </section>

        {/* ─── Row 4: Dedicated Scala & Apache Spark Details Card with Earth Station Photo ─── */}
        <section className="asrf-spark-scala-detailed-card">
          <div className="asrf-tech-left-col">
            <div className="asrf-sec-title-row">
              <Database size={16} className="text-blue" />
              <h3 className="asrf-sec-h3">Scala and Apache Spark in ASRF</h3>
            </div>

            <div className="asrf-tech-specs-split">
              {/* Apache Spark Column */}
              <div className="asrf-tech-spec-pane">
                <div className="asrf-tech-logo-wrap">
                  <img src="/assets/apache-spark.svg" alt="Apache Spark" className="asrf-spark-big-logo" />
                  <span className="asrf-tech-pill-tag">Apache Spark</span>
                </div>
                <span className="asrf-spec-duty-label">Handles telemetry data processing operations such as:</span>
                <ul className="asrf-spec-list">
                  <li>Telemetry ingestion from probe and Earth Station</li>
                  <li>Data validation and quality checks</li>
                  <li>Data cleaning and noise handling</li>
                  <li>Data transformation and aggregation</li>
                  <li>Feature preparation for AI analysis</li>
                </ul>
              </div>

              {/* Scala Column */}
              <div className="asrf-tech-spec-pane">
                <div className="asrf-tech-logo-wrap">
                  <img src="/assets/scala.svg" alt="Scala" className="asrf-scala-big-logo" />
                  <span className="asrf-tech-pill-tag red">Scala</span>
                </div>
                <span className="asrf-spec-duty-label">Implements the telemetry-processing logic, including:</span>
                <ul className="asrf-spec-list">
                  <li>Defining data processing pipelines</li>
                  <li>Transformation and feature-engineering logic</li>
                  <li>Integration with Apache Spark</li>
                  <li>Preparing structured telemetry for downstream (LSTM, PPO, etc.)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Photo: Large Earth Station Satellite Antenna */}
          <div className="asrf-tech-right-photo">
            <img
              src="/assets/earth-station-dish.jpg"
              alt="Earth Station Satellite Antenna Dish"
              className="asrf-dish-img"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function TargetIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function BrainIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v13" />
    </svg>
  );
}
