import React from 'react';
import { 
  Battery, Thermometer, Cpu, Radio, Move, Navigation, Eye, HardDrive,
  ArrowUpRight, ArrowRight, ArrowDownRight
} from 'lucide-react';
import './HealthMonitor.css';

const iconMap = {
  POWER: Battery,
  POWER_CORE: Battery,
  THERMAL: Thermometer,
  THERMAL_LOOP: Thermometer,
  FLIGHT_COMPUTER: Cpu,
  NAV_COMPUTE: Cpu,
  COMMUNICATION: Radio,
  COMM_ARRAY: Radio,
  MOBILITY: Move,
  NAVIGATION: Navigation,
  SENSORS: Eye,
  STORAGE: HardDrive
};

const formatSubsystemName = (subsystem) => String(subsystem || 'UNKNOWN_SUBSYSTEM').replaceAll('_', ' ');

const formatTimestamp = (value) => {
  if (!value) return '--';
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? String(value) : timestamp.toLocaleTimeString();
};

const getTrendIcon = (trend) => {
  switch (trend) {
    case 'RISING': return <ArrowUpRight size={16} />;
    case 'FALLING': return <ArrowDownRight size={16} />;
    case 'STABLE':
    default: return <ArrowRight size={16} />;
  }
};

export const HealthMonitor = ({ subsystems = [] }) => {
  return (
    <div className="health-monitor">
      <h2 className="section-title">SUBSYSTEM TELEMETRY</h2>
      <div className="subsystem-grid">
        {subsystems.map((sub, idx) => {
          const subsystemName = sub.name || sub.subsystemId || sub.id;
          const status = String(sub.status || 'UNKNOWN').toUpperCase();
          const trend = String(sub.trend || 'STABLE').toUpperCase();
          const health = Number.isFinite(Number(sub.health)) ? Math.max(0, Math.min(100, Number(sub.health))) : 0;
          const Icon = iconMap[subsystemName] || Cpu;
          const statusClass = `status-${status.toLowerCase()}`;
          
          return (
            <div key={idx} className={`subsystem-card ${statusClass}`}>
              <div className="card-header">
                <div className="card-title">
                  <Icon size={20} className="sub-icon" />
                  <span>{formatSubsystemName(subsystemName)}</span>
                </div>
                <div className={`status-badge ${statusClass}`}>{status}</div>
              </div>
              
              <div className="card-body">
                <div className="health-circle">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path className="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path className="circle"
                      strokeDasharray={`${health}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="percentage">{health}%</div>
                </div>
                
                <div className="telemetry-stats">
                  <div className="stat-row">
                    <span className="stat-label">Trend</span>
                    <span className="stat-value trend-val">
                      {trend} {getTrendIcon(trend)}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Signals</span>
                    <span className="stat-value">{sub.signals ?? 0}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Updated</span>
                    <span className="stat-value mono">{formatTimestamp(sub.lastUpdate)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
