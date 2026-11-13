/**
 * SIMULATED TELEMETRY ENGINE
 * Generates realistic-looking telemetry data with coherent state transitions.
 * ALL DATA IS SIMULATED FOR EDUCATIONAL/SCIENTIFIC INTERFACE PURPOSES.
 */

const STATES = {
  NOMINAL: 'NOMINAL',
  DEGRADED: 'DEGRADED',
  FAULT: 'FAULT',
  RECOVERY: 'RECOVERY',
  RECOVERED: 'RECOVERED'
};

class TelemetryEngine {
  constructor() {
    this.state = STATES.NOMINAL;
    this.transitionProgress = 0; // 0 to 1
    
    // Baseline nominal values
    this.baselines = {
      temperature: 65.0, // °C
      power: 84.0, // W
      battery: 100.0, // %
      cpu: 43.0, // %
      commDelay: 13.0, // s
      thermalMargin: 15.0, // °C
      memory: 35.0, // %
      storage: 42.0 // %
    };

    // Current values
    this.current = { ...this.baselines };
    
    // Targets for fault state
    this.faultTargets = {
      temperature: 83.5,
      power: 112.0,
      battery: 92.0,
      cpu: 91.0,
      commDelay: 18.0,
      thermalMargin: 4.0,
      memory: 78.0,
      storage: 42.5
    };

    this.health = {
      wheel: 100,
      nav: 100,
      comm: 100,
      flightComputer: 100
    };

    this.faultTargetsHealth = {
      wheel: 85,
      nav: 100,
      comm: 60,
      flightComputer: 45
    };
  }

  setState(newState) {
    if (Object.values(STATES).includes(newState)) {
      this.state = newState;
      this.transitionProgress = 0;
    }
  }

  // Adds small random walk noise
  _addNoise(val, maxDelta) {
    return val + (Math.random() * 2 - 1) * maxDelta;
  }

  // Interpolate between two values
  _lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  update() {
    // Progress state transitions
    if (this.state === STATES.FAULT && this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 0.05);
    } else if (this.state === STATES.RECOVERY && this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 0.02);
    } else if (this.state === STATES.RECOVERED) {
      this.state = STATES.NOMINAL;
      this.transitionProgress = 0;
    }

    const t = this.transitionProgress;
    
    // Update based on state
    if (this.state === STATES.NOMINAL || this.state === STATES.RECOVERED) {
      this.current.temperature = this._addNoise(this.baselines.temperature, 0.5);
      this.current.power = this._addNoise(this.baselines.power, 1.0);
      this.current.battery = Math.max(0, this.current.battery - 0.001); // Slowly decreases
      this.current.cpu = this._addNoise(this.baselines.cpu, 2.0);
      this.current.commDelay = this._addNoise(this.baselines.commDelay, 0.2);
      this.current.thermalMargin = this._addNoise(this.baselines.thermalMargin, 0.5);
      this.current.memory = this._addNoise(this.baselines.memory, 1.0);
      
      this.health.flightComputer = Math.min(100, this.health.flightComputer + 0.5);
      this.health.comm = Math.min(100, this.health.comm + 0.5);
    } else if (this.state === STATES.FAULT) {
      this.current.temperature = this._addNoise(this._lerp(this.baselines.temperature, this.faultTargets.temperature, t), 1.0);
      this.current.power = this._addNoise(this._lerp(this.baselines.power, this.faultTargets.power, t), 2.0);
      this.current.cpu = this._addNoise(this._lerp(this.baselines.cpu, this.faultTargets.cpu, t), 3.0);
      this.current.commDelay = this._addNoise(this._lerp(this.baselines.commDelay, this.faultTargets.commDelay, t), 0.5);
      this.current.thermalMargin = this._addNoise(this._lerp(this.baselines.thermalMargin, this.faultTargets.thermalMargin, t), 0.5);
      this.current.memory = this._addNoise(this._lerp(this.baselines.memory, this.faultTargets.memory, t), 2.0);
      
      this.health.flightComputer = this._lerp(100, this.faultTargetsHealth.flightComputer, t);
      this.health.comm = this._lerp(100, this.faultTargetsHealth.comm, t);
    } else if (this.state === STATES.RECOVERY) {
      this.current.temperature = this._addNoise(this._lerp(this.faultTargets.temperature, this.baselines.temperature, t), 0.8);
      this.current.power = this._addNoise(this._lerp(this.faultTargets.power, this.baselines.power, t), 1.5);
      this.current.cpu = this._addNoise(this._lerp(this.faultTargets.cpu, this.baselines.cpu, t), 2.5);
      this.current.commDelay = this._addNoise(this._lerp(this.faultTargets.commDelay, this.baselines.commDelay, t), 0.3);
      this.current.thermalMargin = this._addNoise(this._lerp(this.faultTargets.thermalMargin, this.baselines.thermalMargin, t), 0.8);
      this.current.memory = this._addNoise(this._lerp(this.faultTargets.memory, this.baselines.memory, t), 1.5);
      
      this.health.flightComputer = this._lerp(this.faultTargetsHealth.flightComputer, 100, t);
      this.health.comm = this._lerp(this.faultTargetsHealth.comm, 100, t);
    }

    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      state: this.state,
      values: { ...this.current },
      health: { ...this.health },
      timestamp: new Date().toISOString()
    };
  }
}

export const telemetryEngine = new TelemetryEngine();
export { STATES };
