/**
 * SIMULATED FAULT ENGINE
 * Generates and tracks fault events, LSTM analysis, and PPO recovery decisions.
 * ALL DATA IS SIMULATED.
 */

const FAULT_STATES = {
  DETECTED: 'DETECTED',
  ANALYZING: 'ANALYZING',
  RECOVERY: 'RECOVERY',
  RESOLVED: 'RESOLVED'
};

class FaultEngine {
  constructor() {
    this.activeFault = null;
    this.timeline = [];
  }

  generateFaultId() {
    const randomHex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return `FLT-2026-${randomHex}`;
  }

  triggerFault(subsystem = 'FLIGHT_COMPUTER') {
    const id = this.generateFaultId();
    this.activeFault = {
      id,
      subsystem,
      state: FAULT_STATES.DETECTED,
      detectedAt: new Date().toISOString()
    };
    
    this.addTimelineEvent({
      time: this.activeFault.detectedAt,
      type: 'FAULT_DETECTED',
      description: `Anomaly detected in ${subsystem} telemetry stream`,
      id: this.activeFault.id
    });

    return this.activeFault;
  }

  analyzeFault() {
    if (!this.activeFault) return null;
    
    this.activeFault.state = FAULT_STATES.ANALYZING;
    const analysis = {
      anomalyScore: (0.85 + Math.random() * 0.14).toFixed(3),
      faultProbability: (0.90 + Math.random() * 0.08).toFixed(3),
      confidence: (0.92 + Math.random() * 0.07).toFixed(3),
      predictedSubsystem: this.activeFault.subsystem,
      patterns: ['High CPU Load', 'Power Spike', 'Thermal Increase']
    };

    const time = new Date().toISOString();
    this.addTimelineEvent({
      time,
      type: 'LSTM_ANALYSIS_COMPLETE',
      description: 'LSTM Model completed temporal pattern analysis',
      data: analysis
    });

    return analysis;
  }

  generateRecoveryDecision() {
    if (!this.activeFault) return null;
    
    this.activeFault.state = FAULT_STATES.RECOVERY;
    const decision = {
      action: 'CMD-SUB-019',
      name: 'SUBSYSTEM_RESET',
      rewardEstimate: (0.85 + Math.random() * 0.1).toFixed(3),
      safetyConstraint: 'VERIFIED',
      alternatives: [
        { action: 'CMD-PWR-017', reward: 0.65 },
        { action: 'CMD-SAF-002', reward: 0.45 }
      ]
    };

    const time = new Date().toISOString();
    this.addTimelineEvent({
      time,
      type: 'PPO_DECISION_GENERATED',
      description: `PPO Agent selected optimal recovery policy: ${decision.name}`,
      data: decision
    });

    return decision;
  }

  resolveFault() {
    if (!this.activeFault) return false;
    
    this.activeFault.state = FAULT_STATES.RESOLVED;
    this.activeFault.resolvedAt = new Date().toISOString();
    
    this.addTimelineEvent({
      time: this.activeFault.resolvedAt,
      type: 'FAULT_RESOLVED',
      description: `Fault ${this.activeFault.id} successfully mitigated`
    });

    const resolved = { ...this.activeFault };
    this.activeFault = null;
    return resolved;
  }

  addTimelineEvent(event) {
    this.timeline.unshift(event);
    if (this.timeline.length > 50) this.timeline.pop();
  }

  getTimeline() {
    return [...this.timeline];
  }
}

export const faultEngine = new FaultEngine();
export { FAULT_STATES };
