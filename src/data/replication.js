/**
 * Replication Core definitions.
 */

export const REPLICATION_MODELS = [
  { id: 'MOD-LST-01', type: 'LSTM Anomaly Detector', version: 'v2.4.1', status: 'ACTIVE' },
  { id: 'MOD-PPO-01', type: 'PPO Recovery Agent', version: 'v1.9.0', status: 'ACTIVE' },
  { id: 'MOD-SYS-01', type: 'Replication State Model', version: 'v3.0.0', status: 'ACTIVE' }
];

export const REPLICATION_TESTS = [
  { id: 'TST-001', name: 'Thermal runaway simulation', result: 'PASS', score: 0.98 },
  { id: 'TST-002', name: 'Comm drop mitigation', result: 'PASS', score: 0.95 }
];
