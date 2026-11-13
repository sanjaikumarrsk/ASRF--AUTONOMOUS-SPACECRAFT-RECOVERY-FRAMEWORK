/**
 * SIMULATED HEALTH ENGINE
 * Tracks subsystem health status and trends.
 * ALL DATA IS SIMULATED.
 */

const STATUS = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  FAULT: 'FAULT'
};

const TREND = {
  STABLE: 'STABLE',
  RISING: 'RISING',
  FALLING: 'FALLING'
};

class HealthEngine {
  constructor() {
    this.subsystems = {
      POWER: { health: 100, status: STATUS.HEALTHY, trend: TREND.STABLE },
      THERMAL: { health: 99, status: STATUS.HEALTHY, trend: TREND.STABLE },
      FLIGHT_COMPUTER: { health: 100, status: STATUS.HEALTHY, trend: TREND.STABLE },
      COMMUNICATION: { health: 98, status: STATUS.HEALTHY, trend: TREND.STABLE },
      MOBILITY: { health: 95, status: STATUS.HEALTHY, trend: TREND.FALLING },
      NAVIGATION: { health: 100, status: STATUS.HEALTHY, trend: TREND.STABLE },
      SENSORS: { health: 97, status: STATUS.HEALTHY, trend: TREND.STABLE },
      STORAGE: { health: 99, status: STATUS.HEALTHY, trend: TREND.STABLE }
    };
    this.history = [];
  }

  update(telemetrySnapshot) {
    // Map telemetry state to health impacts
    const isFault = telemetrySnapshot.state === 'FAULT';
    const isRecovery = telemetrySnapshot.state === 'RECOVERY';

    if (isFault) {
      this.subsystems.FLIGHT_COMPUTER.health = telemetrySnapshot.health.flightComputer;
      this.subsystems.FLIGHT_COMPUTER.status = STATUS.FAULT;
      this.subsystems.FLIGHT_COMPUTER.trend = TREND.FALLING;

      this.subsystems.THERMAL.health = Math.max(60, 100 - (telemetrySnapshot.values.temperature - 65));
      this.subsystems.THERMAL.status = STATUS.DEGRADED;
      this.subsystems.THERMAL.trend = TREND.FALLING;

      this.subsystems.COMMUNICATION.health = telemetrySnapshot.health.comm;
      this.subsystems.COMMUNICATION.status = STATUS.DEGRADED;
      this.subsystems.COMMUNICATION.trend = TREND.FALLING;
    } else if (isRecovery) {
      this.subsystems.FLIGHT_COMPUTER.health = telemetrySnapshot.health.flightComputer;
      this.subsystems.FLIGHT_COMPUTER.status = STATUS.DEGRADED;
      this.subsystems.FLIGHT_COMPUTER.trend = TREND.RISING;
      
      this.subsystems.THERMAL.health = Math.min(100, this.subsystems.THERMAL.health + 0.5);
      this.subsystems.THERMAL.status = this.subsystems.THERMAL.health > 90 ? STATUS.HEALTHY : STATUS.DEGRADED;
      this.subsystems.THERMAL.trend = TREND.RISING;

      this.subsystems.COMMUNICATION.health = telemetrySnapshot.health.comm;
      this.subsystems.COMMUNICATION.status = this.subsystems.COMMUNICATION.health > 90 ? STATUS.HEALTHY : STATUS.DEGRADED;
      this.subsystems.COMMUNICATION.trend = TREND.RISING;
    } else {
      // Nominal recovery or stable
      Object.keys(this.subsystems).forEach(key => {
        if (this.subsystems[key].health < 100) {
           this.subsystems[key].health = Math.min(100, this.subsystems[key].health + 0.1);
           this.subsystems[key].trend = TREND.RISING;
        } else {
           this.subsystems[key].trend = TREND.STABLE;
        }
        if (this.subsystems[key].health > 95) {
           this.subsystems[key].status = STATUS.HEALTHY;
        }
      });
    }

    // Save history point
    this.history.push({
      timestamp: telemetrySnapshot.timestamp,
      subsystems: JSON.parse(JSON.stringify(this.subsystems))
    });
    if (this.history.length > 100) this.history.shift();

    return this.subsystems;
  }
}

export const healthEngine = new HealthEngine();
export { STATUS, TREND };
