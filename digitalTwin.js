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
    let riskScore = (event.mode === "real") 
      ? result.riskScore 
      : 100;

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

  /**
   * Called to update the blockchain hashes for the dashboard
   */
  pushBlockchainData(ipfsHash, txHash) {
    if (this.latestTwinState) {
        this.latestTwinState.blockchain = { ipfsHash, txHash };
    }
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

    // Perform exact additive risk calculation according to Honeypot specs
    const anomalyResult = this._detectAnomalies(event, profile);

    // Update the profile
    this._updateRealProfile(profile, event, anomalyResult);

    // Log the event
    this._logEvent(event, anomalyResult, "real");

    return {
      anomaly: anomalyResult.anomaly,
      reasons: anomalyResult.reasons,
      riskScore: anomalyResult.totalRisk
    };
  }

  _createNewUserProfile(userId) {
    return {
      userId,
      knownIPs: new Map(),
      behaviorScore: {
        currentRisk: 0,
        anomalyCount: 0
      },
      lastUpdated: Date.now()
    };
  }

  _updateRealProfile(profile, event, anomalyResult) {
    profile.lastUpdated = Date.now();

    if (anomalyResult.anomaly) {
      profile.behaviorScore.anomalyCount++;
      profile.behaviorScore.currentRisk = Math.min(100, Math.max(profile.behaviorScore.currentRisk, anomalyResult.totalRisk));
    }
  }

  /**
   * CORE GHOST ENGINE LOGIC
   * Triggered by user movement patterns
   */
  _detectAnomalies(event, profile) {
    let isAnomaly = false;
    let reasons = [];
    let risk_score = 0;

    // 1. Bot-Pattern: Attempt Frequency < 2 seconds (+40 risk)
    if (event.action === 'login_failed_attempt' && event.metrics && event.metrics.timeBetweenAttemptsMs < 2000) {
        risk_score += 40;
        isAnomaly = true;
        reasons.push("Bot-Pattern: Rapid Login Retries");
    }

    // 2. Unknown Entity: Differing IP or Device from Baseline (+30 risk)
    if (event.baseline_metadata) {
        if (event.ip !== event.baseline_metadata.ip || event.device !== event.baseline_metadata.device) {
            risk_score += 30;
            isAnomaly = true;
            reasons.push("Unknown Entity: Network/Device Mismatch");
        }
    }

    // 3. Time Anomaly: Login occurs at 3 AM / Deep Night (2AM-4AM) (+20 risk)
    const currentHour = new Date().getHours();
    if (currentHour >= 2 && currentHour <= 4) {
        risk_score += 20;
        isAnomaly = true;
        reasons.push("Time Anomaly: Suspicious Operating Hours");
    }
    
    // Add old heuristics if needed casually, but keeping spec dominant.
    if (event.metrics && event.metrics.jitterScore > 15 && risk_score < 70) {
       risk_score += 15;
       isAnomaly = true;
       reasons.push("Anomalous Jitter detected");
    }

    return { anomaly: isAnomaly, reasons, totalRisk: risk_score };
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