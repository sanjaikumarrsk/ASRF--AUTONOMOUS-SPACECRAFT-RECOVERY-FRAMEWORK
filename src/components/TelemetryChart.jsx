import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea
} from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import './TelemetryChart.css';

/**
 * TelemetryChart - Dedicated scientific visualizations for the 6 core channels:
 * 1. 'line': Interactive Line Chart (Core Processor Temp with 65°C & 85°C thresholds & normal band)
 * 2. 'area': Live Area Chart (CPU Load 0-100% with gradient fill & high-load highlight)
 * 3. 'bar': Vertical Bar Chart (PDU Main Power in Watts with distinct intervals & spike highlighting)
 * 4. 'gauge': Radial Gauge with Historical Trend (Battery SOC % with 3 colored zones)
 * 5. 'scatter': Scatter Plot (Deep Space Communication Delay vs Time with anomaly dots)
 * 6. 'bullet': Thermal Operating Margin Bullet Chart (Safe/Warning/Critical bands & target marker)
 */
export default function TelemetryChart({
  title,
  data = [],
  dataKey = 'value',
  unit = '',
  color = '#2563eb',
  chartType = 'line', // 'line' | 'area' | 'bar' | 'gauge' | 'scatter' | 'bullet'
  height = 200,
  thresholds = [],
  domain,
  compact = false,
  showControls = true,
  normalRange = null, // [min, max]
}) {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 2 = 50%, 3 = 25% window
  const [panOffset, setPanOffset] = useState(0); // Pan offset in data points

  // Slice data based on zoom and pan
  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (zoomLevel === 1) return data;
    const windowSize = Math.max(10, Math.floor(data.length / zoomLevel));
    const maxOffset = Math.max(0, data.length - windowSize);
    const offset = Math.min(maxOffset, Math.max(0, panOffset));
    const start = Math.max(0, data.length - windowSize - offset);
    return data.slice(start, start + windowSize);
  }, [data, zoomLevel, panOffset]);

  const latestVal = data.length > 0 ? data[data.length - 1][dataKey] : 0;
  const isViolation = thresholds.some(t => latestVal >= t.value && t.color?.includes('dc2626'));

  // Custom tooltips with exact timestamp and units
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const point = payload[0];
      const val = point.value !== undefined ? Number(point.value).toFixed(2) : '--';
      return (
        <div className="telemetry-chart__tooltip">
          <p className="telemetry-chart__tooltip-label">UTC Time: {label || point.payload?.time}</p>
          <p className="telemetry-chart__tooltip-value" style={{ color: point.payload?.isSpike ? '#dc2626' : color }}>
            {val} {unit}
          </p>
          {point.payload?.note && (
            <span className="telemetry-chart__tooltip-note">{point.payload.note}</span>
          )}
        </div>
      );
    }
    return null;
  };

  const gradientId = `grad-${title?.replace(/[^a-zA-Z0-9]/g, '') || 'chart'}`;

  // -------------------------------------------------------------
  // CHART 1: CORE PROCESSOR TEMPERATURE (Interactive Line Chart)
  // -------------------------------------------------------------
  if (chartType === 'line') {
    return (
      <div className={`telemetry-chart ${compact ? 'telemetry-chart--compact' : ''}`}>
        <ChartHeader
          title={title}
          unit={unit}
          latestVal={latestVal}
          color={isViolation ? '#dc2626' : color}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          dataLength={data.length}
          showControls={showControls}
        />
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={displayData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis domain={domain || [30, 95]} tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Shaded Normal Operating Zone */}
            <ReferenceArea y1={40} y2={75} fill="#dcfce7" fillOpacity={0.35} />

            {/* Threshold Indicators */}
            <ReferenceLine y={85.0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'CRITICAL (85°C)', fill: '#dc2626', fontSize: 9, position: 'insideTopRight' }} />
            <ReferenceLine y={65.0} stroke="#d97706" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'WARN (65°C)', fill: '#d97706', fontSize: 9, position: 'insideTopRight' }} />

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={latestVal >= 85 ? '#dc2626' : (latestVal >= 65 ? '#d97706' : color)}
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHART 2: FLIGHT COMPUTER CPU LOAD (Area Chart)
  // -------------------------------------------------------------
  if (chartType === 'area') {
    return (
      <div className={`telemetry-chart ${compact ? 'telemetry-chart--compact' : ''}`}>
        <ChartHeader
          title={title}
          unit={unit}
          latestVal={latestVal}
          color={latestVal >= 80 ? '#dc2626' : color}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          dataLength={data.length}
          showControls={showControls}
        />
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={displayData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            
            {/* High utilization highlight zone */}
            <ReferenceArea y1={80} y2={100} fill="#fee2e2" fillOpacity={0.4} />
            <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'High Load (80%)', fill: '#dc2626', fontSize: 9, position: 'insideTopRight' }} />

            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHART 3: PDU MAIN POWER CONSUMPTION (Vertical Bar Chart)
  // -------------------------------------------------------------
  if (chartType === 'bar') {
    const barData = displayData.slice(-24);
    return (
      <div className={`telemetry-chart ${compact ? 'telemetry-chart--compact' : ''}`}>
        <ChartHeader
          title={title}
          unit={unit}
          latestVal={latestVal}
          color={latestVal >= 130 ? '#dc2626' : color}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          dataLength={data.length}
          showControls={showControls}
        />
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={barData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis domain={domain || [60, 150]} tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={130} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Bus Peak (130W)', fill: '#dc2626', fontSize: 9, position: 'insideTopRight' }} />
            
            <Bar dataKey={dataKey} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {barData.map((entry, index) => {
                const val = entry[dataKey];
                const barColor = val >= 130 ? '#dc2626' : (val >= 120 ? '#d97706' : color);
                return <Cell key={`cell-${index}`} fill={barColor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHART 4: BATTERY STATE OF CHARGE (Radial Gauge + Historical Trend)
  // -------------------------------------------------------------
  if (chartType === 'gauge') {
    const soc = Math.min(100, Math.max(0, latestVal));
    const gaugeColor = soc >= 60 ? '#16a34a' : (soc >= 40 ? '#d97706' : '#dc2626');
    const regionLabel = soc >= 60 ? 'SAFE NOMINAL' : (soc >= 40 ? 'WARNING MARGIN' : 'CRITICAL RESERVE');

    return (
      <div className={`telemetry-chart ${compact ? 'telemetry-chart--compact' : ''}`}>
        <ChartHeader
          title={title}
          unit={unit}
          latestVal={latestVal}
          color={gaugeColor}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          dataLength={data.length}
          showControls={showControls}
        />
        <div className="telemetry-gauge-container" style={{ height }}>
          {/* Radial Gauge Dial */}
          <div className="telemetry-gauge-dial">
            <svg viewBox="0 0 120 70" className="telemetry-gauge-svg">
              {/* Critical Track (0-40%) */}
              <path d="M 15 60 A 45 45 0 0 1 45 20" fill="none" stroke="#fee2e2" strokeWidth="9" />
              {/* Warning Track (40-60%) */}
              <path d="M 45 20 A 45 45 0 0 1 75 20" fill="none" stroke="#fef3c7" strokeWidth="9" />
              {/* Safe Track (60-100%) */}
              <path d="M 75 20 A 45 45 0 0 1 105 60" fill="none" stroke="#dcfce7" strokeWidth="9" />
              {/* Active Progress Needle Arc */}
              <path
                d="M 15 60 A 45 45 0 0 1 105 60"
                fill="none"
                stroke={gaugeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(soc / 100) * 141.4} 141.4`}
              />
            </svg>
            <div className="telemetry-gauge-value">
              <span className="gauge-num" style={{ color: gaugeColor }}>{Number(latestVal).toFixed(1)}</span>
              <span className="gauge-unit">%</span>
            </div>
            <div className="gauge-sublabel" style={{ color: gaugeColor }}>
              {regionLabel}
            </div>
          </div>

          {/* Historical Trend Sparkline underneath */}
          <div className="telemetry-gauge-spark">
            <div className="gauge-spark-caption">HISTORICAL SOC TREND (PAST {displayData.length * 2}s)</div>
            <ResponsiveContainer width="100%" height={65}>
              <AreaChart data={displayData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gaugeSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gaugeColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={gaugeColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[40, 100]} hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={dataKey} stroke={gaugeColor} strokeWidth={1.8} fill="url(#gaugeSparkGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHART 5: DEEP SPACE COMMUNICATION DELAY (Scatter Plot)
  // -------------------------------------------------------------
  if (chartType === 'scatter') {
    const scatterPoints = displayData.map((d, idx) => ({
      ...d,
      index: idx,
      isSpike: d[dataKey] >= 9.0,
      note: d[dataKey] >= 9.0 ? 'Transponder RTT Spike' : 'Nominal DSN Link'
    }));

    return (
      <div className={`telemetry-chart ${compact ? 'telemetry-chart--compact' : ''}`}>
        <ChartHeader
          title={title}
          unit={unit}
          latestVal={latestVal}
          color={latestVal >= 9.0 ? '#dc2626' : color}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          dataLength={data.length}
          showControls={showControls}
        />
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={scatterPoints} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis domain={domain || [2, 14]} tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Normal Delay Range */}
            <ReferenceArea y1={3} y2={8} fill="#f0fdf4" fillOpacity={0.5} />
            {/* Warning Threshold */}
            <ReferenceLine y={9.0} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Latency Limit (9.0s)', fill: '#dc2626', fontSize: 9, position: 'insideTopRight' }} />

            {/* Individual Scatter Points on telemetry stream */}
            <Line
              type="linear"
              dataKey={dataKey}
              stroke="transparent"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const isSpike = payload?.isSpike;
                return (
                  <circle
                    key={`dot-${props.index}`}
                    cx={cx}
                    cy={cy}
                    r={isSpike ? 5 : 3.5}
                    fill={isSpike ? '#dc2626' : color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                );
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHART 6: THERMAL OPERATING MARGIN (Bullet Chart)
  // -------------------------------------------------------------
  if (chartType === 'bullet') {
    const marginVal = latestVal !== undefined ? latestVal : 36.5;
    const targetMargin = 20.0; // Target minimum safe margin (°C)
    const bulletStatus = marginVal >= 20 ? 'SAFE' : (marginVal >= 10 ? 'WARNING' : 'CRITICAL');
    const bulletColor = marginVal >= 20 ? '#16a34a' : (marginVal >= 10 ? '#d97706' : '#dc2626');

    return (
      <div className={`telemetry-chart ${compact ? 'telemetry-chart--compact' : ''}`}>
        <ChartHeader
          title={title}
          unit={unit}
          latestVal={latestVal}
          color={bulletColor}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          dataLength={data.length}
          showControls={showControls}
        />
        <div className="telemetry-bullet-container" style={{ height }}>
          {/* Bullet Bar Visualization */}
          <div className="bullet-scale-box">
            <div className="bullet-track">
              {/* Range 1: Critical (0 to 10°C) */}
              <div className="bullet-range bullet-range--critical" style={{ width: '22%' }}>
                <span>0–10°C (CRIT)</span>
              </div>
              {/* Range 2: Warning (10 to 20°C) */}
              <div className="bullet-range bullet-range--warn" style={{ width: '22%' }}>
                <span>10–20°C (WARN)</span>
              </div>
              {/* Range 3: Safe (> 20°C) */}
              <div className="bullet-range bullet-range--safe" style={{ width: '56%' }}>
                <span>20–45°C (NOMINAL SAFE)</span>
              </div>

              {/* Target Marker at 20°C */}
              <div className="bullet-target-marker" style={{ left: '44%' }} title="Target Minimum Safe Margin (20°C)" />

              {/* Actual Value Bar */}
              <div
                className="bullet-actual-bar"
                style={{
                  width: `${Math.min(100, Math.max(0, (marginVal / 45) * 100))}%`,
                  backgroundColor: bulletColor,
                }}
              />
            </div>
            <div className="bullet-labels-row">
              <span>0°C Margin</span>
              <span className="bullet-target-tag">Target: &ge;20°C</span>
              <span>45°C Margin</span>
            </div>
          </div>

          {/* Historical Trend underneath */}
          <div className="telemetry-gauge-spark">
            <div className="gauge-spark-caption">THERMAL HEADROOM TREND (85°C &minus; DIE TEMP)</div>
            <ResponsiveContainer width="100%" height={65}>
              <AreaChart data={displayData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="marginSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={bulletColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={bulletColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 45]} hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={dataKey} stroke={bulletColor} strokeWidth={1.8} fill="url(#marginSparkGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Subcomponent: Unified Header with zoom and pan controls
function ChartHeader({
  title,
  unit,
  latestVal,
  color,
  zoomLevel,
  setZoomLevel,
  panOffset,
  setPanOffset,
  dataLength,
  showControls
}) {
  return (
    <div className="telemetry-chart__header">
      <div className="telemetry-chart__title-area">
        <h4 className="telemetry-chart__title">{title}</h4>
        {unit && <span className="telemetry-chart__unit">({unit})</span>}
      </div>
      {showControls && (
        <div className="telemetry-chart__actions">
          <span className="telemetry-chart__current-val" style={{ color }}>
            {latestVal !== undefined ? Number(latestVal).toFixed(1) : '--'} {unit}
          </span>
          <div className="telemetry-chart__zoom-group">
            {zoomLevel > 1 && (
              <>
                <button
                  type="button"
                  className="chart-zoom-btn"
                  title="Pan Left (Earlier)"
                  onClick={() => setPanOffset(prev => prev + 5)}
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  type="button"
                  className="chart-zoom-btn"
                  title="Pan Right (Later)"
                  disabled={panOffset <= 0}
                  onClick={() => setPanOffset(prev => Math.max(0, prev - 5))}
                >
                  <ChevronRight size={12} />
                </button>
              </>
            )}
            <button
              type="button"
              className="chart-zoom-btn"
              title="Zoom In"
              onClick={() => setZoomLevel(prev => Math.min(4, prev + 1))}
            >
              <ZoomIn size={12} />
            </button>
            <button
              type="button"
              className="chart-zoom-btn"
              title="Zoom Out"
              disabled={zoomLevel <= 1}
              onClick={() => {
                setZoomLevel(prev => Math.max(1, prev - 1));
                if (zoomLevel <= 2) setPanOffset(0);
              }}
            >
              <ZoomOut size={12} />
            </button>
            {(zoomLevel > 1 || panOffset > 0) && (
              <button
                type="button"
                className="chart-zoom-btn"
                title="Reset Zoom & Pan"
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset(0);
                }}
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
