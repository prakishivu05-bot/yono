/**
 * Digital Twin Engine - High Fidelity Behavioral Monitor
 * Threshold: 1.5s Hesitation | Jitter: 15%
 */

export class DigitalTwinEngine {
  constructor() {
    // Stores behavioral profiles for real users
    this.userProfiles = new Map();
    // Stores profiles for identified attackers
    this.attackerProfiles = new Map();
    
    // Logs for historical analysis
    this.logs = {
      normalLogs: [],
      anomalyLogs: [],
      attackerLogs: []
    };
    
    // State sent to the Dashboard
    this.latestTwinState = null;
  }

  /**
   * Main entry point for every user action (click, tap, keypress)
   */
  processEvent(event) {
    if (!event || !event.mode) {
      return { anomaly: false, reasons: ["Invalid format"], confidenceScore: 0 };
    }

    let result;
    if (event.mode === "real") {
      result = this._processRealMode(event);
    } else {
      result = this._processHoneypotMode(event);
    }

    // DYNAMIC RISK CALCULATION: 
    // Risk = 100 - Consistency (If score is 100, risk is 0%)
    let riskScore = (event.mode === "real") 
      ? Math.max(0, 100 - result.confidenceScore) 
      : result.confidenceScore;

    // GHOST LOG DATA: Captured for the dashboard live feed
    this.latestTwinState = {
      userId: event.userId || "Unknown",
      riskScore: Math.floor(riskScore),
      action: event.action,
      timestamp: new Date().toLocaleTimeString(),
      anomaly: result.anomaly,
      reasons: result.reasons,
      mode: event.mode
    };

    return result;
  }

  /**
   * Called by server.js to push data to the dashboard.html
   */
  getLatestState() {
    return this.latestTwinState;
  }

  // ============================================
  // REAL MODE: BEHAVIORAL ANALYSIS
  // ============================================

  _processRealMode(event) {
    let profile = this.userProfiles.get(event.userId);
    
    if (!profile) {
      profile = this._createNewUserProfile(event.userId);
      this.userProfiles.set(event.userId, profile);
    }

    // Perform behavioral check against the 1.5s and Jitter rules
    const anomalyResult = this._detectAnomalies(event, profile);

    // Update the profile (decreases consistency if anomalous)
    this._updateRealProfile(profile, event, anomalyResult);

    // Log the event
    this._logEvent(event, anomalyResult, "real");

    return {
      anomaly: anomalyResult.anomaly,
      reasons: anomalyResult.reasons,
      confidenceScore: profile.behaviorScore.consistencyScore
    };
  }

  _createNewUserProfile(userId) {
    return {
      userId,
      knownIPs: new Map(),
      behaviorScore: {
        consistencyScore: 100, // START AT 100 (0% RISK)
        anomalyCount: 0
      },
      lastUpdated: Date.now()
    };
  }

  _updateRealProfile(profile, event, anomalyResult) {
    profile.lastUpdated = Date.now();

    if (anomalyResult.anomaly) {
      profile.behaviorScore.anomalyCount++;
      // Drop consistency by 15 points per anomaly to make risk bar jump
      profile.behaviorScore.consistencyScore = Math.max(0, profile.behaviorScore.consistencyScore - 15);
    } else {
      // Slow recovery: If the user behaves, the risk slowly goes back down
      profile.behaviorScore.consistencyScore = Math.min(100, profile.behaviorScore.consistencyScore + 2);
    }
  }

  /**
   * CORE GHOST ENGINE LOGIC
   * Triggered by user movement patterns
   */
  _detectAnomalies(event, profile) {
    let isAnomaly = false;
    let reasons = [];

    // 1. DYNAMIC HESITATION (1.5s Threshold)
    if (event.metrics && event.metrics.hesitationMs > 1500) {
      isAnomaly = true;
      reasons.push(`Hesitation Detected (${(event.metrics.hesitationMs / 1000).toFixed(1)}s)`);
    }

    // 2. ERRATIC MOVEMENT (Jitter > 15%)
    if (event.metrics && event.metrics.jitterScore > 15) {
      isAnomaly = true;
      reasons.push("Erratic Mouse/Touch Jitter");
    }

    // 3. KEYBOARD ANOMALY (Backspaces during sensitive input)
    if (event.metrics && event.metrics.backspaces > 2) {
      isAnomaly = true;
      reasons.push("High Correction Rate (Insecure)");
    }

    // 4. TRANSACTION LIMIT
    if (event.amount > 5000) {
      isAnomaly = true;
      reasons.push("High Value Transaction Alert");
    }

    return { anomaly: isAnomaly, reasons };
  }

  // ============================================
  // HONEYPOT MODE: ATTACKER TRAP
  // ============================================

  _processHoneypotMode(event) {
    // Honeypot events are 100% risk by definition
    return {
      anomaly: true,
      reasons: ["Honeypot Access Detected"],
      confidenceScore: 100 
    };
  }

  _logEvent(event, anomalyResult, mode) {
    const logEntry = {
      timestamp: event.timestamp,
      action: event.action,
      reasons: anomalyResult.reasons
    };

    if (mode === "honeypot") {
      this.logs.attackerLogs.push(logEntry);
    } else if (anomalyResult.anomaly) {
      this.logs.anomalyLogs.push(logEntry);
    } else {
      this.logs.normalLogs.push(logEntry);
    }
  }

  getLogs() {
    return this.logs;
  }
}