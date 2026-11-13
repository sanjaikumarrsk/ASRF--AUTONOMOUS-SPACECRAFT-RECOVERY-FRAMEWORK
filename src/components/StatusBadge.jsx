import React from 'react';
import './StatusBadge.css';

const StatusBadge = ({ status, label, size = 'md' }) => {
  const getStatusCategory = (st) => {
    const s = st.toLowerCase();
    if (['nominal', 'healthy', 'passed', 'verified', 'success'].includes(s)) return 'healthy';
    if (['warning', 'degraded'].includes(s)) return 'warning';
    if (['fault', 'error'].includes(s)) return 'fault';
    if (['monitoring', 'active', 'running'].includes(s)) return 'monitoring';
    if (['standby', 'ready', 'offline'].includes(s)) return 'standby';
    return 'standby';
  };

  const category = getStatusCategory(status);

  return (
    <div className={`status-badge badge-${size} status-${category}`}>
      <span className="status-dot"></span>
      <span className="status-text">{label || status.toUpperCase()}</span>
    </div>
  );
};

export default StatusBadge;
