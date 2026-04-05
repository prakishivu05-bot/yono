export class BehaviorAnalyzer {
    constructor() {
        // In-memory baseline store per user
        this.baselines = new Map();
    }

    initBaseline(userId) {
        if (!this.baselines.has(userId)) {
            this.baselines.set(userId, {
                avgLoginTimeOfDay: null, 
                avgSessionDurationMs: 0,
                avgClickSpeedMs: 0,
                sampleCount: 0
            });
        }
    }

    updateBaseline(userId, sessionData) {
        this.initBaseline(userId);
        let base = this.baselines.get(userId);
        base.sampleCount++;
        // Moving average logic would go here
    }

    analyze(userId, currentSession) {
        // currentSession = { loginTimeMs, sessionDurationMs, clickSpeedMs, isHeadless, loginHour }
        this.initBaseline(userId);
        
        let riskScore = 0;
        let reasons = [];

        // Check 1: Suspicious speed (Bot-like)
        if (currentSession.clickSpeedMs !== undefined && currentSession.clickSpeedMs < 100) {
            riskScore += 50;
            reasons.push("Superhuman interaction speed detected (bot potential).");
        }

        // Check 2: Headless Browser / Missing Headers
        if (currentSession.isHeadless) {
            riskScore += 80;
            reasons.push("Headless browser execution signature detected.");
        }

        // Check 3: Unusual login time (e.g. 3 AM)
        if (currentSession.loginHour !== undefined && (currentSession.loginHour < 5 || currentSession.loginHour > 23)) {
            riskScore += 20;
            reasons.push("Unusual login hour (Late Night/Early Morning).");
        }

        return {
            behaviorRiskScore: Math.min(100, riskScore),
            anomalyDetected: riskScore >= 40,
            explanation: reasons
        };
    }
}
