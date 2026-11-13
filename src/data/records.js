/**
 * Historical records for the decision ledger and records page.
 */

export const HISTORICAL_RECORDS = Array.from({ length: 35 }).map((_, i) => ({
  id: `REC-${1000 + i}`,
  timestamp: new Date(Date.now() - (35 - i) * 86400000).toISOString(),
  eventId: `EVT-${Math.floor(Math.random() * 9000) + 1000}`,
  subsystem: ['POWER', 'THERMAL', 'FLIGHT_COMPUTER', 'COMMUNICATION'][Math.floor(Math.random() * 4)],
  eventType: ['TELEMETRY_EVENT', 'FAULT_DETECT', 'AI_ANALYSIS', 'PPO_DECISION', 'COMMAND_ISSUE'][Math.floor(Math.random() * 5)],
  severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
  confidence: (0.8 + Math.random() * 0.19).toFixed(2),
  action: 'LOG',
  result: 'SUCCESS'
}));
