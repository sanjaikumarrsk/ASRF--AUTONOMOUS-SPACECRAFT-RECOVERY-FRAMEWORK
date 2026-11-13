/**
 * Command definitions and parameters.
 */

export const COMMANDS = [
  {
    id: 'CMD-PRC-042',
    name: 'PROCESSOR_RESTART',
    target: 'FLIGHT_COMPUTER',
    action: 'Soft restart of primary processing unit',
    parameters: ['timeout: 300s', 'mode: SAFE'],
    validity: 'Valid',
    safety: 'High',
    verifiedLibrary: true,
    rollback: 'Automatic on failure',
    recoveryConsistency: 'Verified',
    authorization: 'AUTO_AI',
    status: 'READY'
  },
  {
    id: 'CMD-PWR-017',
    name: 'POWER_RECONFIGURATION',
    target: 'POWER',
    action: 'Switch to redundant power bus',
    parameters: ['bus: B', 'isolate: A'],
    validity: 'Valid',
    safety: 'Medium',
    verifiedLibrary: true,
    rollback: 'Manual',
    recoveryConsistency: 'Verified',
    authorization: 'GROUND_CMD',
    status: 'READY'
  },
  {
    id: 'CMD-THM-031',
    name: 'THERMAL_CONTROL_ADJUSTMENT',
    target: 'THERMAL',
    action: 'Increase active cooling rate',
    parameters: ['pump: 2', 'speed: 80%'],
    validity: 'Valid',
    safety: 'High',
    verifiedLibrary: true,
    rollback: 'Automatic on temp stabilize',
    recoveryConsistency: 'Verified',
    authorization: 'AUTO_PID',
    status: 'READY'
  },
  {
    id: 'CMD-COM-008',
    name: 'COMMUNICATION_RECONFIGURATION',
    target: 'COMMUNICATION',
    action: 'Switch to Low Gain Antenna',
    parameters: ['antenna: LGA', 'rate: 1kbps'],
    validity: 'Valid',
    safety: 'High',
    verifiedLibrary: true,
    rollback: 'Timeout 1hr',
    recoveryConsistency: 'Verified',
    authorization: 'AUTO_AI',
    status: 'READY'
  },
  {
    id: 'CMD-SAF-002',
    name: 'SAFE_MODE',
    target: 'SYSTEM',
    action: 'Enter system-wide safe mode',
    parameters: ['level: CRITICAL'],
    validity: 'Valid',
    safety: 'Critical',
    verifiedLibrary: true,
    rollback: 'Ground Command Only',
    recoveryConsistency: 'Verified',
    authorization: 'SYSTEM_MONITOR',
    status: 'READY'
  },
  {
    id: 'CMD-SUB-019',
    name: 'SUBSYSTEM_RESET',
    target: 'VARIOUS',
    action: 'Reset specific degraded subsystem',
    parameters: ['subsystem: $TARGET'],
    validity: 'Valid',
    safety: 'Medium',
    verifiedLibrary: true,
    rollback: 'Automatic on failure',
    recoveryConsistency: 'Verified',
    authorization: 'AUTO_AI',
    status: 'READY'
  }
];
