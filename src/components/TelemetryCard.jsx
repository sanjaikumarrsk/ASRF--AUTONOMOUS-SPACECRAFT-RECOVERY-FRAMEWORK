import React from 'react';
import './TelemetryCard.css';

/**
 * TelemetryCard - Displays a single telemetry reading with value, unit, and trend
 * @param {Object} props
 * @param {string} props.label - Telemetry parameter name
 * @param {number|string} props.value - Current value
 * @param {string} props.unit - Unit of measurement
 * @param {string} props.status - healthy|warning|fault|monitoring
 * @param {string} props.trend - up|down|stable
 * @param {string} props.icon - Optional icon component
 */
export default function TelemetryCard({ label, value, unit, status = 'healthy', trend = 'stable', icon, compact = false }) {
  const statusClass = `telemetry-card--${status}`;
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendClass = `trend--${trend}`;

  return (
    <div className={`telemetry-card ${statusClass} ${compact ? 'telemetry-card--compact' : ''}`}>
      <div className="telemetry-card__header">
        {icon && <span className="telemetry-card__icon">{icon}</span>}
        <span className="telemetry-card__label">{label}</span>
        <span className={`telemetry-card__trend ${trendClass}`}>{trendArrow}</span>
      </div>
      <div className="telemetry-card__value-row">
        <span className="telemetry-card__value">{typeof value === 'number' ? value.toFixed(1) : value}</span>
        <span className="telemetry-card__unit">{unit}</span>
      </div>
      <div className="telemetry-card__status-bar">
        <div className={`telemetry-card__status-indicator telemetry-card__status-indicator--${status}`}></div>
      </div>
    </div>
  );
}

