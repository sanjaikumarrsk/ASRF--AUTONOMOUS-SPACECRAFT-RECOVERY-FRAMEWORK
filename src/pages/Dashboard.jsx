import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Dashboard.css';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../auth/AuthContext';
import {
  Activity, AlertTriangle, ArrowUpRight, ArrowDownRight,
  CheckCircle, Clock, Cpu, Database, Eye, Flame, HardDrive,
  Layers, Radio, RefreshCw, ShieldAlert, ShieldCheck,
  Thermometer, Zap, Play, Pause, ChevronDown, Calendar, Check,
  BarChart2, PieChart
} from 'lucide-react';
import EarthValidationDemoModal from '../components/EarthValidationDemoModal';

// Subsystems list
const SUBSYSTEM_LIST = [
  'Overall Space Probe',
  'Flight Computer',
  'Power',
  'Thermal',
  'Communication',
  'Navigation',
  'Science',
  'Mobility',
  'Control',
  'Environment'
];

// Subsystem nominal calibrations
const SUBSYSTEM_CONFIGS = {
  'Overall Space Probe': {
    health: 96.8, active: '25 / 25', rate: 13920, anomalies: 2,
    temp: 48.6, power: 112.4, comm: 98.7, rad: 0.28,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'Core Temperature',
    powerMetricName: 'PDU Main Power',
    pieData: [
      { name: 'Healthy', value: 23, color: '#16a34a' },
      { name: 'Warning', value: 2, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '20-30', count: 4 },
      { range: '30-40', count: 7 },
      { range: '40-50', count: 18 },
      { range: '50-60', count: 12 },
      { range: '60-70', count: 5 },
      { range: '70-80', count: 2 }
    ],
    lineLabel: 'Flight Computer Core Temp',
    scatterXName: 'CPU Load', scatterYName: 'Processor Temp',
  },
  'Flight Computer': {
    health: 98.5, active: '8 / 8', rate: 4200, anomalies: 0,
    temp: 52.4, power: 34.2, comm: 99.4, rad: 0.22,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'RAD750 Die Temp',
    powerMetricName: 'Avionics Power Draw',
    pieData: [
      { name: 'Healthy', value: 8, color: '#16a34a' },
      { name: 'Warning', value: 0, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '35-45', count: 2 },
      { range: '45-55', count: 14 },
      { range: '55-65', count: 8 },
      { range: '65-75', count: 1 }
    ],
    lineLabel: 'RAD750 Processor Junction Temp',
    scatterXName: 'Task Scheduler Load', scatterYName: 'Core Temp',
  },
  'Power': {
    health: 97.8, active: '6 / 6', rate: 2840, anomalies: 1,
    temp: 24.6, power: 134.8, comm: 99.1, rad: 0.18,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'PDU Heat Sink',
    powerMetricName: 'Solar Array Generation',
    pieData: [
      { name: 'Healthy', value: 5, color: '#16a34a' },
      { name: 'Warning', value: 1, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '80-100W', count: 3 },
      { range: '100-120W', count: 9 },
      { range: '120-140W', count: 15 },
      { range: '140-160W', count: 4 }
    ],
    lineLabel: '28V Regulated Bus Voltage',
    scatterXName: 'Shunt Current (A)', scatterYName: 'Cell Temp',
  },
  'Thermal': {
    health: 95.6, active: '6 / 6', rate: 1950, anomalies: 0,
    temp: -28.4, power: 28.5, comm: 98.6, rad: 0.31,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'Radiator Return Fluid',
    powerMetricName: 'Thermal Louver Heater',
    pieData: [
      { name: 'Healthy', value: 6, color: '#16a34a' },
      { name: 'Warning', value: 0, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '-40 to -30°C', count: 6 },
      { range: '-30 to -20°C', count: 12 },
      { range: '-20 to -10°C', count: 8 },
      { range: '-10 to 0°C', count: 2 }
    ],
    lineLabel: 'Ammonia Fluid Loop Flow Margin',
    scatterXName: 'Solar Incidence Flux', scatterYName: 'Loop Temp',
  },
  'Communication': {
    health: 98.4, active: '6 / 6', rate: 3100, anomalies: 1,
    temp: 36.2, power: 48.6, comm: 98.9, rad: 0.24,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'Ka-Band SSPA Temp',
    powerMetricName: 'RF Transmitter Draw',
    pieData: [
      { name: 'Healthy', value: 5, color: '#16a34a' },
      { name: 'Warning', value: 1, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '10-15 dB', count: 2 },
      { range: '15-20 dB', count: 10 },
      { range: '20-25 dB', count: 14 },
      { range: '25-30 dB', count: 4 }
    ],
    lineLabel: 'Deep Space Downlink SNR Margin',
    scatterXName: 'HGA Gimbal Angle', scatterYName: 'Signal Margin (dB)',
  },
  'Navigation': {
    health: 99.1, active: '6 / 6', rate: 2650, anomalies: 0,
    temp: 18.5, power: 16.4, comm: 99.6, rad: 0.20,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'IMU Gyro Junction',
    powerMetricName: 'Navcam Processing',
    pieData: [
      { name: 'Healthy', value: 6, color: '#16a34a' },
      { name: 'Warning', value: 0, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '0.01-0.02°/h', count: 8 },
      { range: '0.02-0.03°/h', count: 15 },
      { range: '0.03-0.04°/h', count: 6 },
      { range: '0.04-0.05°/h', count: 1 }
    ],
    lineLabel: 'Stellar Quaternion Error Vector',
    scatterXName: 'Pitch Quaternion', scatterYName: 'Star Tracker Lock',
  },
  'Science': {
    health: 96.1, active: '5 / 5', rate: 4800, anomalies: 0,
    temp: -12.4, power: 58.2, comm: 97.8, rad: 0.34,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'SuperCam Spectrometer',
    powerMetricName: 'Science Payload Bus',
    pieData: [
      { name: 'Healthy', value: 5, color: '#16a34a' },
      { name: 'Warning', value: 0, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '100-250 cnts', count: 4 },
      { range: '250-500 cnts', count: 12 },
      { range: '500-750 cnts', count: 11 },
      { range: '750-1000 cnts', count: 3 }
    ],
    lineLabel: 'Photon Counter Rate (cnt/s)',
    scatterXName: 'Integration Time (ms)', scatterYName: 'Sensor Flux',
  },
  'Mobility': {
    health: 98.2, active: '6 / 6', rate: 1820, anomalies: 0,
    temp: 14.2, power: 72.4, comm: 99.0, rad: 0.25,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'Wheel Actuator Temp',
    powerMetricName: 'Bogie Drive Power',
    pieData: [
      { name: 'Healthy', value: 6, color: '#16a34a' },
      { name: 'Warning', value: 0, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '0-5% slip', count: 14 },
      { range: '5-15% slip', count: 9 },
      { range: '15-25% slip', count: 5 },
      { range: '25-35% slip', count: 2 }
    ],
    lineLabel: 'Wheel Traction Current (A)',
    scatterXName: 'Motor RPM', scatterYName: 'Slip Coefficient',
  },
  'Control': {
    health: 97.4, active: '3 / 3', rate: 1420, anomalies: 0,
    temp: 22.0, power: 38.0, comm: 98.5, rad: 0.22,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'Arm Joint Actuator',
    powerMetricName: 'Drill Motor Power',
    pieData: [
      { name: 'Healthy', value: 3, color: '#16a34a' },
      { name: 'Warning', value: 0, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '10-20 Nm', count: 7 },
      { range: '20-30 Nm', count: 14 },
      { range: '30-40 Nm', count: 6 },
      { range: '40-50 Nm', count: 1 }
    ],
    lineLabel: 'Percussive Drill Torque (Nm)',
    scatterXName: 'Joint Angle', scatterYName: 'Actuator Torque',
  },
  'Environment': {
    health: 98.0, active: '3 / 3', rate: 980, anomalies: 0,
    temp: -48.2, power: 12.0, comm: 99.2, rad: 0.28,
    tempUnit: '°C', powerUnit: 'W',
    primaryMetricName: 'MEDA Thermal Sensor',
    powerMetricName: 'Sensor Heater Power',
    pieData: [
      { name: 'Healthy', value: 3, color: '#16a34a' },
      { name: 'Warning', value: 0, color: '#d97706' },
      { name: 'Faulty', value: 0, color: '#dc2626' },
      { name: 'Offline', value: 0, color: '#64748b' }
    ],
    histogramBins: [
      { range: '0-2 m/s', count: 6 },
      { range: '2-5 m/s', count: 15 },
      { range: '5-8 m/s', count: 7 },
      { range: '8-12 m/s', count: 2 }
    ],
    lineLabel: 'Martian Atmospheric Pressure (Pa)',
    scatterXName: 'Ambient Temp', scatterYName: 'Atmospheric Pressure',
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [isEarthDemoOpen, setIsEarthDemoOpen] = useState(false);
  const [selectedSubsystem, setSelectedSubsystem] = useState('Overall Space Probe');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [dateRangeText, setDateRangeText] = useState('Nov 10, 2026 - Nov 12, 2026');
  const [isSimRunning, setIsSimRunning] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  // Interactive Tooltip State
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    value: '',
    unit: '',
    timestamp: '',
    subsystem: ''
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live telemetry stream state
  const [streamState, setStreamState] = useState({
    tick: 0,
    liveTemp: 48.6,
    livePower: 112.4,
    liveCpu: 43.5,
    liveComm: 98.7,
    liveThroughput: 13920,
    history: []
  });

  // Fast smooth telemetry stream polling + websocket
  useEffect(() => {
    let ws = null;
    let pollInterval = null;

    // Initial history fetch
    fetch('http://127.0.0.1:8000/api/telemetry/history')
      .then(res => res.json())
      .then(data => {
        if (data?.history && data.history.length > 0) {
          const latest = data.history[data.history.length - 1];
          setStreamState(prev => ({
            ...prev,
            history: data.history.slice(-30),
            liveTemp: latest.processorTemperature || prev.liveTemp,
            livePower: latest.powerDraw || prev.livePower,
            liveCpu: latest.processorLoad || prev.liveCpu,
          }));
        }
      })
      .catch(() => {});

    // WebSocket connection
    try {
      ws = new WebSocket('ws://127.0.0.1:8000/api/telemetry/ws');
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.spacecraft?.metrics) {
            const m = data.spacecraft.metrics;
            setLastUpdate(new Date().toLocaleTimeString());
            setStreamState(prev => ({
              ...prev,
              tick: prev.tick + 1,
              liveTemp: m.processorTemperature || prev.liveTemp,
              livePower: m.powerDraw || prev.livePower,
              liveCpu: m.processorLoad || prev.liveCpu,
              liveThroughput: m.sparkThroughputMsgSec || prev.liveThroughput,
              history: data.telemetryHistory ? data.telemetryHistory.slice(-30) : prev.history,
            }));
          }
        } catch (e) {}
      };
      ws.onclose = () => setWsConnected(false);
    } catch (e) {
      setWsConnected(false);
    }

    // High frequency 1.5s smooth polling fallback to keep telemetry lively
    pollInterval = setInterval(() => {
      fetch('http://127.0.0.1:8000/api/telemetry/history')
        .then(res => res.json())
        .then(data => {
          if (data?.history && data.history.length > 0) {
            const latest = data.history[data.history.length - 1];
            setStreamState(prev => ({
              ...prev,
              tick: prev.tick + 1,
              history: data.history.slice(-30),
              liveTemp: latest.processorTemperature || prev.liveTemp,
              livePower: latest.powerDraw || prev.livePower,
              liveCpu: latest.processorLoad || prev.liveCpu,
            }));
            setLastUpdate(new Date().toLocaleTimeString());
          }
        })
        .catch(() => {});
    }, 1500);

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const toggleSimulation = async () => {
    try {
      const endpoint = isSimRunning ? 'pause' : 'resume';
      await fetch(`http://127.0.0.1:8000/api/simulation/${endpoint}`, { method: 'POST' });
      setIsSimRunning(!isSimRunning);
    } catch (e) {
      setIsSimRunning(!isSimRunning);
    }
  };

  // Subsystem-Filtered Synchronized Values
  const config = SUBSYSTEM_CONFIGS[selectedSubsystem] || SUBSYSTEM_CONFIGS['Overall Space Probe'];
  const isOverall = selectedSubsystem === 'Overall Space Probe';

  const dynamicTemp = isOverall ? streamState.liveTemp : +(config.temp + (streamState.liveTemp - 48.6) * 0.4).toFixed(1);
  const dynamicPower = isOverall ? streamState.livePower : +(config.power + (streamState.livePower - 112.4) * 0.5).toFixed(1);
  const dynamicRate = isOverall ? streamState.liveThroughput : Math.round(config.rate + (streamState.tick % 10) * 8);

  // Helper for mouse hover tooltip
  const showTooltip = (e, info) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY - 12,
      title: info.title,
      value: info.value,
      unit: info.unit || '',
      timestamp: info.timestamp || lastUpdate,
      subsystem: selectedSubsystem
    });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // 1. Line Chart Data (Time series)
  const linePoints = useMemo(() => {
    return streamState.history.map((pt, i) => {
      const x = 40 + (i / Math.max(1, streamState.history.length - 1)) * 480;
      const baseVal = isOverall ? (pt.processorTemperature || 50) : (config.temp + ((pt.processorTemperature || 50) - 48.6) * 0.35);
      const y = 175 - ((Math.max(20, Math.min(80, baseVal)) - 20) / 60) * 150;
      return { x, y, val: +baseVal.toFixed(1), time: pt.time };
    });
  }, [streamState.history, isOverall, config.temp]);
  const lineSvgPath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 2. Pie Chart (Pie Slices using SVG paths)
  const pieSlices = useMemo(() => {
    const total = config.pieData.reduce((acc, d) => acc + d.value, 0) || 1;
    let accumulatedAngle = 0;
    return config.pieData.map(slice => {
      const fraction = slice.value / total;
      const angle = fraction * 2 * Math.PI;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle = endAngle;

      const r = 55;
      const cx = 75, cy = 75;
      const x1 = cx + r * Math.sin(startAngle);
      const y1 = cy - r * Math.cos(startAngle);
      const x2 = cx + r * Math.sin(endAngle);
      const y2 = cy - r * Math.cos(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;

      const d = slice.value === total
        ? `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`
        : `M ${cx},${cy} L ${x1.toFixed(1)},${y1.toFixed(1)} A ${r},${r} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;

      return {
        ...slice,
        d,
        percentage: ((slice.value / total) * 100).toFixed(0)
      };
    });
  }, [config.pieData]);

  // 3. Bar Chart (Subsystem Health Comparison)
  const barChartSubsystems = useMemo(() => [
    { name: 'Navigation', health: 99.1, color: '#0284c7' },
    { name: 'Power', health: 97.8, color: '#16a34a' },
    { name: 'Communication', health: 98.4, color: '#2563eb' },
    { name: 'Thermal', health: 95.6, color: '#d97706' },
    { name: 'Science', health: 96.1, color: '#9333ea' },
    { name: 'Flight Computer', health: 98.5, color: '#4f46e5' },
    { name: 'Mobility', health: 98.2, color: '#0891b2' },
  ], []);

  // 4. Histogram (Frequency distribution of telemetry bins)
  const maxBinCount = Math.max(...config.histogramBins.map(b => b.count), 1);

  // 5. Scatter Plot (CPU load vs Temp)
  const scatterPoints = useMemo(() => {
    return streamState.history.map((pt, i) => {
      const xVal = isOverall ? (pt.processorLoad || (35 + (i % 25))) : (42 + ((pt.processorLoad || 40) - 40) * 0.3);
      const yVal = isOverall ? (pt.processorTemperature || (46 + (xVal * 0.2))) : (config.temp + (xVal * 0.15));
      const sx = 45 + ((Math.max(10, Math.min(90, xVal)) - 10) / 80) * 460;
      const sy = 175 - ((Math.max(10, Math.min(80, yVal)) - 10) / 70) * 150;
      return { sx, sy, xVal: +xVal.toFixed(1), yVal: +yVal.toFixed(1), time: pt.time };
    });
  }, [streamState.history, isOverall, config.temp]);

  // 6. Area Chart (Dynamic power consumption trend)
  const areaPoints = useMemo(() => {
    return streamState.history.map((pt, i) => {
      const x = 40 + (i / Math.max(1, streamState.history.length - 1)) * 480;
      const baseVal = isOverall ? (pt.powerDraw || 110) : (config.power + ((pt.powerDraw || 110) - 112.4) * 0.4);
      const y = 175 - ((Math.max(20, Math.min(160, baseVal)) - 20) / 140) * 150;
      return { x, y, val: +baseVal.toFixed(1), time: pt.time };
    });
  }, [streamState.history, isOverall, config.power]);
  const areaLinePath = areaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaFillPath = areaPoints.length > 0
    ? `${areaLinePath} L ${areaPoints[areaPoints.length - 1].x.toFixed(1)},175 L ${areaPoints[0].x.toFixed(1)},175 Z`
    : '';

  return (
    <div className="asrf-dashboard-layout" onMouseLeave={hideTooltip}>
      {/* ─── Sidebar ─── */}
      <Sidebar />

      {/* ─── Main Workspace ─── */}
      <div className="asrf-dashboard-main">
        {/* Top Mission Control Header */}
        <header className="asrf-topbar">
          <div className="asrf-topbar-left">
            <h1 className="asrf-page-title">Dashboard</h1>
            <p className="asrf-page-subtitle">Real-time telemetry and subsystem health monitoring</p>
          </div>

          <div className="asrf-topbar-right">
            {/* Simulation Mode Indicator */}
            <div className="asrf-sim-badge">
              <span className={`asrf-sim-dot ${wsConnected ? 'live' : 'pulse'}`} />
              <span className="asrf-sim-text">SIMULATION MODE</span>
              <span className="asrf-sim-clock">{lastUpdate}</span>
            </div>

            {/* Simulation Play/Pause Toggle */}
            <button
              type="button"
              className="asrf-sim-btn"
              onClick={toggleSimulation}
              title={isSimRunning ? 'Pause simulation stream' : 'Resume simulation stream'}
            >
              {isSimRunning ? <Pause size={14} /> : <Play size={14} />}
              <span>{isSimRunning ? 'Pause' : 'Resume'}</span>
            </button>

            {/* FULLY FUNCTIONAL SUBSYSTEM DROPDOWN */}
            <div className="asrf-dropdown-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className={`asrf-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <span className="asrf-dropdown-current">{selectedSubsystem}</span>
                <ChevronDown size={14} className={`asrf-dropdown-chevron ${isDropdownOpen ? 'rotated' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="asrf-dropdown-menu" role="listbox">
                  {SUBSYSTEM_LIST.map((sub) => (
                    <div
                      key={sub}
                      role="option"
                      aria-selected={selectedSubsystem === sub}
                      className={`asrf-dropdown-item ${selectedSubsystem === sub ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSubsystem(sub);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span>{sub}</span>
                      {selectedSubsystem === sub && <Check size={14} className="text-blue" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="asrf-date-pill">
              <Calendar size={14} />
              <span>{dateRangeText}</span>
            </div>

            {/* Initial Profile Icon */}
            <div className="asrf-user-initial" title="Operator Profile">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'R'}
            </div>
          </div>
        </header>

        {/* Subsystem Selected Feedback Banner */}
        {!isOverall && (
          <div className="asrf-subsystem-banner">
            <span className="asrf-banner-dot" />
            <span>Telemetry Filter Active: <strong>{selectedSubsystem} Subsystem</strong> — Synchronized across all 6 charts & KPI values.</span>
            <button
              type="button"
              className="asrf-banner-reset"
              onClick={() => setSelectedSubsystem('Overall Space Probe')}
            >
              Reset to Overall Space Probe &times;
            </button>
          </div>
        )}

        {/* ─── 4 Primary KPI Cards (Synchronized with selected subsystem) ─── */}
        <section className="asrf-kpi-grid">
          {/* Card 1: System Health */}
          <div className="asrf-kpi-card">
            <div className="asrf-kpi-top">
              <div className="asrf-kpi-icon-box asrf-icon--green">
                <ShieldCheck size={18} />
              </div>
              <span className="asrf-kpi-label">{isOverall ? 'System Health' : `${selectedSubsystem} Health`}</span>
            </div>
            <div className="asrf-kpi-body">
              <span className="asrf-kpi-val">{config.health}%</span>
              <span className="asrf-kpi-trend asrf-trend--up">
                <ArrowUpRight size={13} /> +0.4%
              </span>
            </div>
            <div className="asrf-kpi-sub">{isOverall ? 'AUTONOMOUS OPERATIONS' : `${selectedSubsystem} Nominal Envelopes`}</div>
          </div>

          {/* Card 2: Active Components */}
          <div className="asrf-kpi-card">
            <div className="asrf-kpi-top">
              <div className="asrf-kpi-icon-box asrf-icon--blue">
                <Layers size={18} />
              </div>
              <span className="asrf-kpi-label">Active Components</span>
            </div>
            <div className="asrf-kpi-body">
              <span className="asrf-kpi-val">{config.active}</span>
              <span className="asrf-kpi-trend asrf-trend--neutral">
                100% ONLINE
              </span>
            </div>
            <div className="asrf-kpi-sub">{isOverall ? '8 Subsystems Operational' : `${selectedSubsystem} Channels Hot`}</div>
          </div>

          {/* Card 3: Telemetry Update Rate */}
          <div className="asrf-kpi-card">
            <div className="asrf-kpi-top">
              <div className="asrf-kpi-icon-box asrf-icon--purple">
                <Activity size={18} />
              </div>
              <span className="asrf-kpi-label">Telemetry Ingestion Rate</span>
            </div>
            <div className="asrf-kpi-body">
              <span className="asrf-kpi-val">{dynamicRate.toLocaleString()}</span>
              <span className="asrf-kpi-unit">pkt/s</span>
            </div>
            <div className="asrf-kpi-sub">Apache Spark & Scala Pipeline</div>
          </div>

          {/* Card 4: Detected Anomalies */}
          <div className="asrf-kpi-card">
            <div className="asrf-kpi-top">
              <div className="asrf-kpi-icon-box asrf-icon--red">
                <AlertTriangle size={18} />
              </div>
              <span className="asrf-kpi-label">Detected Anomalies</span>
            </div>
            <div className="asrf-kpi-body">
              <span className="asrf-kpi-val">{config.anomalies}</span>
              <span className="asrf-kpi-trend asrf-trend--down">
                <ArrowDownRight size={13} /> -50%
              </span>
            </div>
            <div className="asrf-kpi-sub">Auto-mitigated by PPO Agent</div>
          </div>
        </section>

        {/* ─── 4 Sensor Metric Cards (Synchronized with selected subsystem) ─── */}
        <section className="asrf-sensor-grid">
          {/* Sensor 1: Core Temp / Primary Parameter */}
          <div className="asrf-sensor-card">
            <div className="asrf-sensor-head">
              <div className="asrf-sensor-icon asrf-icon--cyan">
                <Thermometer size={15} />
              </div>
              <span className="asrf-sensor-name">{config.primaryMetricName}</span>
            </div>
            <div className="asrf-sensor-val">{dynamicTemp} {config.tempUnit}</div>
            <div className="asrf-sensor-spark">
              <svg viewBox="0 0 100 20" className="asrf-spark-line">
                <path d="M 0,14 Q 25,6 50,12 T 100,8" fill="none" stroke="#0891b2" strokeWidth="1.75" />
              </svg>
            </div>
          </div>

          {/* Sensor 2: Power Output / Power Rail */}
          <div className="asrf-sensor-card">
            <div className="asrf-sensor-head">
              <div className="asrf-sensor-icon asrf-icon--green">
                <Zap size={15} />
              </div>
              <span className="asrf-sensor-name">{config.powerMetricName}</span>
            </div>
            <div className="asrf-sensor-val">{dynamicPower} {config.powerUnit}</div>
            <div className="asrf-sensor-spark">
              <svg viewBox="0 0 100 20" className="asrf-spark-line">
                <path d="M 0,12 Q 25,18 50,8 T 100,10" fill="none" stroke="#16a34a" strokeWidth="1.75" />
              </svg>
            </div>
          </div>

          {/* Sensor 3: Comm Signal */}
          <div className="asrf-sensor-card">
            <div className="asrf-sensor-head">
              <div className="asrf-sensor-icon asrf-icon--purple">
                <Radio size={15} />
              </div>
              <span className="asrf-sensor-name">Comm. Link Margin</span>
            </div>
            <div className="asrf-sensor-val">{config.comm}%</div>
            <div className="asrf-sensor-spark">
              <svg viewBox="0 0 100 20" className="asrf-spark-line">
                <path d="M 0,8 Q 25,4 50,12 T 100,6" fill="none" stroke="#7c3aed" strokeWidth="1.75" />
              </svg>
            </div>
          </div>

          {/* Sensor 4: Radiation */}
          <div className="asrf-sensor-card">
            <div className="asrf-sensor-head">
              <div className="asrf-sensor-icon asrf-icon--amber">
                <AlertTriangle size={15} />
              </div>
              <span className="asrf-sensor-name">Galactic Radiation</span>
            </div>
            <div className="asrf-sensor-val">{config.rad} mSv/h</div>
            <div className="asrf-sensor-spark">
              <svg viewBox="0 0 100 20" className="asrf-spark-line">
                <path d="M 0,16 Q 25,10 50,14 T 100,6" fill="none" stroke="#d97706" strokeWidth="1.75" />
              </svg>
            </div>
          </div>
        </section>

        {/* ─── 6 DISTINCT SCIENTIFIC CHART VISUALIZATIONS ─── */}
        <section className="asrf-charts-section">
          <div className="asrf-section-title-bar">
            <div>
              <h2 className="asrf-chart-section-heading">Aerospace Engineering Telemetry & Instrumentation</h2>
              <p className="asrf-chart-section-desc">
                Continuous dynamic monitoring across 6 distinct scientific chart types
              </p>
            </div>
            <button
              type="button"
              className="asrf-demo-action-btn"
              onClick={() => setIsEarthDemoOpen(true)}
            >
              <Cpu size={14} />
              <span>Earth Validation Demonstration</span>
            </button>
          </div>

          <div className="asrf-six-charts-grid">
            {/* CHART 1: LINE CHART — Telemetry Time Series */}
            <div className="asrf-chart-panel">
              <div className="asrf-panel-header">
                <div className="asrf-panel-title-group">
                  <span className="asrf-chart-type-tag line">1. Line Chart</span>
                  <h3 className="asrf-panel-title">{config.lineLabel} Time Series</h3>
                </div>
                <div className="asrf-panel-metric">
                  <span className="asrf-panel-metric-val">{dynamicTemp}</span>
                  <span className="asrf-panel-metric-unit">{config.tempUnit}</span>
                </div>
              </div>
              <div className="asrf-chart-canvas">
                <svg viewBox="0 0 540 200" className="asrf-svg-chart">
                  <line x1="40" y1="25" x2="520" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="65" x2="520" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="105" x2="520" y2="105" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="145" x2="520" y2="145" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="175" x2="520" y2="175" stroke="#cbd5e1" strokeWidth="1" />

                  {/* Critical Limit Line */}
                  <line x1="40" y1="40" x2="520" y2="40" stroke="#ef4444" strokeDasharray="4 2" strokeWidth="1" />
                  <text x="525" y="43" fill="#ef4444" fontSize="9" fontFamily="monospace">Crit</text>

                  <text x="32" y="28" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">80</text>
                  <text x="32" y="108" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">50</text>
                  <text x="32" y="178" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">20</text>

                  {lineSvgPath && (
                    <path
                      d={lineSvgPath}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {linePoints.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      className="asrf-hoverable-point"
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      onMouseEnter={(e) => showTooltip(e, {
                        title: config.lineLabel,
                        value: p.val,
                        unit: config.tempUnit,
                        timestamp: p.time
                      })}
                      onMouseLeave={hideTooltip}
                    />
                  ))}

                  {linePoints.length > 0 && (
                    <>
                      <text x="45" y="194" fill="#64748b" fontSize="9" fontFamily="monospace">{linePoints[0]?.time || 'T-60s'}</text>
                      <text x="270" y="194" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                        {linePoints[Math.floor(linePoints.length / 2)]?.time || 'T-30s'}
                      </text>
                      <text x="515" y="194" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">{linePoints[linePoints.length - 1]?.time || 'Now'}</text>
                    </>
                  )}
                </svg>
              </div>
              <div className="asrf-panel-footer">
                <span>{selectedSubsystem} Channel</span>
                <span className="asrf-status-nominal">NOMINAL ENVELOPE</span>
              </div>
            </div>

            {/* CHART 2: PIE CHART — Component Status Distribution */}
            <div className="asrf-chart-panel">
              <div className="asrf-panel-header">
                <div className="asrf-panel-title-group">
                  <span className="asrf-chart-type-tag pie">2. Pie Chart</span>
                  <h3 className="asrf-panel-title">Component Status Breakdown</h3>
                </div>
                <div className="asrf-panel-metric">
                  <span className="asrf-panel-metric-val">{config.active.split(' / ')[0]}</span>
                  <span className="asrf-panel-metric-unit">Units</span>
                </div>
              </div>
              <div className="asrf-chart-canvas asrf-pie-layout">
                <div className="asrf-pie-svg-box">
                  <svg viewBox="0 0 150 150" className="asrf-pie-svg">
                    {pieSlices.map((slice, idx) => (
                      <path
                        key={idx}
                        d={slice.d}
                        fill={slice.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="asrf-hoverable-slice"
                        onMouseEnter={(e) => showTooltip(e, {
                          title: `${slice.name} Status`,
                          value: `${slice.value} units (${slice.percentage}%)`,
                          unit: '',
                          timestamp: 'Current State'
                        })}
                        onMouseLeave={hideTooltip}
                      />
                    ))}
                  </svg>
                </div>

                <div className="asrf-pie-legend">
                  {config.pieData.map((slice, idx) => (
                    <div
                      key={idx}
                      className="asrf-legend-item"
                      onMouseEnter={(e) => showTooltip(e, {
                        title: slice.name,
                        value: `${slice.value} units`,
                        unit: '',
                        timestamp: 'Active'
                      })}
                      onMouseLeave={hideTooltip}
                    >
                      <span className="asrf-legend-dot" style={{ backgroundColor: slice.color }} />
                      <span className="asrf-legend-text">{slice.name}</span>
                      <span className="asrf-legend-count">{slice.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="asrf-panel-footer">
                <span>{selectedSubsystem} Units</span>
                <span className="asrf-status-nominal">INTEGRITY VERIFIED</span>
              </div>
            </div>

            {/* CHART 3: BAR CHART — Subsystem Health Comparison */}
            <div className="asrf-chart-panel">
              <div className="asrf-panel-header">
                <div className="asrf-panel-title-group">
                  <span className="asrf-chart-type-tag bar">3. Bar Chart</span>
                  <h3 className="asrf-panel-title">Subsystem Health Comparison</h3>
                </div>
                <div className="asrf-panel-metric">
                  <span className="asrf-panel-metric-val">{barChartSubsystems.length}</span>
                  <span className="asrf-panel-metric-unit">Sectors</span>
                </div>
              </div>
              <div className="asrf-chart-canvas">
                <div className="asrf-bar-chart-container">
                  {barChartSubsystems.map((sub, i) => (
                    <div
                      key={i}
                      className="asrf-bar-row asrf-hoverable-bar"
                      onMouseEnter={(e) => showTooltip(e, {
                        title: `${sub.name} Subsystem`,
                        value: `${sub.health}`,
                        unit: '% Health',
                        timestamp: 'Nominal Score'
                      })}
                      onMouseLeave={hideTooltip}
                    >
                      <div className="asrf-bar-label-col">
                        <span className="asrf-bar-name">{sub.name}</span>
                        <span className="asrf-bar-val">{sub.health}%</span>
                      </div>
                      <div className="asrf-bar-track">
                        <div
                          className="asrf-bar-fill"
                          style={{
                            width: `${sub.health}%`,
                            backgroundColor: sub.color || '#2563eb',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="asrf-panel-footer">
                <span>Fleet-Wide Assessment</span>
                <span className="asrf-status-nominal">ALL SUBSYSTEMS &gt; 95%</span>
              </div>
            </div>

            {/* CHART 4: HISTOGRAM — Distribution of Telemetry Readings */}
            <div className="asrf-chart-panel">
              <div className="asrf-panel-header">
                <div className="asrf-panel-title-group">
                  <span className="asrf-chart-type-tag hist">4. Histogram</span>
                  <h3 className="asrf-panel-title">Telemetry Distribution (Bins)</h3>
                </div>
                <div className="asrf-panel-metric">
                  <span className="asrf-panel-metric-val">{config.histogramBins.length}</span>
                  <span className="asrf-panel-metric-unit">Bins</span>
                </div>
              </div>
              <div className="asrf-chart-canvas">
                <svg viewBox="0 0 540 200" className="asrf-svg-chart">
                  <line x1="40" y1="25" x2="520" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="100" x2="520" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="175" x2="520" y2="175" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="40" y1="25" x2="40" y2="175" stroke="#cbd5e1" strokeWidth="1" />

                  <text x="32" y="28" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">{maxBinCount}</text>
                  <text x="32" y="103" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">{Math.round(maxBinCount / 2)}</text>
                  <text x="32" y="178" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">0</text>

                  {/* Histogram Vertical Bars */}
                  {config.histogramBins.map((bin, idx) => {
                    const binWidth = 460 / config.histogramBins.length;
                    const bx = 45 + idx * binWidth + 4;
                    const barH = (bin.count / maxBinCount) * 145;
                    const by = 175 - barH;
                    return (
                      <g key={idx}>
                        <rect
                          x={bx}
                          y={by}
                          width={binWidth - 8}
                          height={barH}
                          fill="#4f46e5"
                          rx="3"
                          className="asrf-hoverable-bar"
                          onMouseEnter={(e) => showTooltip(e, {
                            title: `Bin Range: ${bin.range}`,
                            value: bin.count,
                            unit: 'readings',
                            timestamp: 'Sample Window'
                          })}
                          onMouseLeave={hideTooltip}
                        />
                        <text
                          x={bx + (binWidth - 8) / 2}
                          y="192"
                          fontSize="8.5"
                          fill="#64748b"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {bin.range}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="asrf-panel-footer">
                <span>Statistical Frequency</span>
                <span className="asrf-status-nominal">GAUSSIAN PROFILE</span>
              </div>
            </div>

            {/* CHART 5: SCATTER PLOT — Telemetry Correlation */}
            <div className="asrf-chart-panel">
              <div className="asrf-panel-header">
                <div className="asrf-panel-title-group">
                  <span className="asrf-chart-type-tag scatter">5. Scatter Plot</span>
                  <h3 className="asrf-panel-title">Correlation: {config.scatterXName} vs {config.scatterYName}</h3>
                </div>
                <div className="asrf-panel-metric">
                  <span className="asrf-panel-metric-val">r = +0.84</span>
                  <span className="asrf-panel-metric-unit">Corr</span>
                </div>
              </div>
              <div className="asrf-chart-canvas">
                <svg viewBox="0 0 540 200" className="asrf-svg-chart">
                  <line x1="40" y1="25" x2="520" y2="25" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="40" y1="100" x2="520" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="40" y1="175" x2="520" y2="175" stroke="#cbd5e1" />
                  <line x1="40" y1="25" x2="40" y2="175" stroke="#cbd5e1" />

                  <text x="32" y="28" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">80</text>
                  <text x="32" y="103" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">45</text>
                  <text x="32" y="178" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">10</text>

                  <text x="50" y="194" fill="#64748b" fontSize="9" fontFamily="monospace">10%</text>
                  <text x="270" y="194" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">50%</text>
                  <text x="500" y="194" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">90%</text>

                  {scatterPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.sx}
                      cy={pt.sy}
                      r="4.5"
                      className="asrf-hoverable-point"
                      fill="#0284c7"
                      fillOpacity="0.85"
                      stroke="#0369a1"
                      strokeWidth="1"
                      onMouseEnter={(e) => showTooltip(e, {
                        title: 'Sensor Correlation Point',
                        value: `${config.scatterXName}: ${pt.xVal} | ${config.scatterYName}: ${pt.yVal}`,
                        unit: '',
                        timestamp: pt.time
                      })}
                      onMouseLeave={hideTooltip}
                    />
                  ))}
                </svg>
              </div>
              <div className="asrf-panel-footer">
                <span>Regression Modeling</span>
                <span className="asrf-status-nominal">POSITIVE COUPLING</span>
              </div>
            </div>

            {/* CHART 6: AREA CHART — Power Consumption Trend */}
            <div className="asrf-chart-panel">
              <div className="asrf-panel-header">
                <div className="asrf-panel-title-group">
                  <span className="asrf-chart-type-tag area">6. Area Chart</span>
                  <h3 className="asrf-panel-title">Power Consumption Over Time</h3>
                </div>
                <div className="asrf-panel-metric">
                  <span className="asrf-panel-metric-val">{dynamicPower}</span>
                  <span className="asrf-panel-metric-unit">W</span>
                </div>
              </div>
              <div className="asrf-chart-canvas">
                <svg viewBox="0 0 540 200" className="asrf-svg-chart">
                  <defs>
                    <linearGradient id="powerGradScientific" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  <line x1="40" y1="25" x2="520" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="75" x2="520" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="125" x2="520" y2="125" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="175" x2="520" y2="175" stroke="#cbd5e1" strokeWidth="1" />

                  <text x="32" y="28" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">160W</text>
                  <text x="32" y="103" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">90W</text>
                  <text x="32" y="178" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">20W</text>

                  {areaFillPath && <path d={areaFillPath} fill="url(#powerGradScientific)" />}
                  {areaLinePath && (
                    <path
                      d={areaLinePath}
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}

                  {areaPoints.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      className="asrf-hoverable-point"
                      fill="#0d9488"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      onMouseEnter={(e) => showTooltip(e, {
                        title: 'PDU Power Draw',
                        value: p.val,
                        unit: 'W',
                        timestamp: p.time
                      })}
                      onMouseLeave={hideTooltip}
                    />
                  ))}

                  {areaPoints.length > 0 && (
                    <>
                      <text x="45" y="194" fill="#64748b" fontSize="9" fontFamily="monospace">{areaPoints[0]?.time || 'T-60s'}</text>
                      <text x="270" y="194" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                        {areaPoints[Math.floor(areaPoints.length / 2)]?.time || 'T-30s'}
                      </text>
                      <text x="515" y="194" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">{areaPoints[areaPoints.length - 1]?.time || 'Now'}</text>
                    </>
                  )}
                </svg>
              </div>
              <div className="asrf-panel-footer">
                <span>PDU Bus Draw</span>
                <span className="asrf-status-nominal">REGULATED (28V BUS)</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Interactive Hover Tooltip */}
      {tooltip.visible && (
        <div
          className="asrf-floating-tooltip"
          style={{
            left: `${tooltip.x + 12}px`,
            top: `${tooltip.y - 30}px`,
          }}
        >
          <div className="asrf-tt-header">{tooltip.title}</div>
          <div className="asrf-tt-val">
            <strong>{tooltip.value}</strong> {tooltip.unit}
          </div>
          <div className="asrf-tt-footer">
            <span>{tooltip.subsystem}</span> &bull; <span>{tooltip.timestamp}</span>
          </div>
        </div>
      )}

      {/* Earth Validation Demonstration Modal */}
      <EarthValidationDemoModal
        isOpen={isEarthDemoOpen}
        onClose={() => setIsEarthDemoOpen(false)}
      />
    </div>
  );
}
