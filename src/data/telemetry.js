/**
 * Static telemetry definitions.
 */

export const TELEMETRY_DEFINITIONS = [
  { id: 'T-01', name: 'Temperature', unit: '°C', normalRange: [60, 70] },
  { id: 'P-01', name: 'Power Draw', unit: 'W', normalRange: [80, 90] },
  { id: 'B-01', name: 'Battery Level', unit: '%', normalRange: [50, 100] },
  { id: 'C-01', name: 'CPU Load', unit: '%', normalRange: [10, 60] },
  { id: 'D-01', name: 'Comm Delay', unit: 's', normalRange: [4, 20] },
  { id: 'M-01', name: 'Memory Usage', unit: '%', normalRange: [20, 50] }
];
