/**
 * Historical fault records.
 */

export const HISTORICAL_FAULTS = [
  {
    id: 'FLT-2025-A1B2',
    timestamp: '2025-10-15T08:23:41Z',
    subsystem: 'THERMAL',
    description: 'Coolant pump brief stall',
    resolution: 'CMD-THM-031 applied automatically',
    severity: 'MEDIUM'
  },
  {
    id: 'FLT-2025-C89F',
    timestamp: '2025-11-02T14:11:05Z',
    subsystem: 'MOBILITY',
    description: 'Wheel current spike on rough terrain',
    resolution: 'Self-corrected after stop',
    severity: 'LOW'
  }
];
