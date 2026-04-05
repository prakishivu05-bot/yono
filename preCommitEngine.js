import { GraphFraudEngine } from './graphFraudEngine.js';
import { ZKPValidator } from './zkpValidator.js';
import { BehaviorAnalyzer } from './behaviorAnalyzer.js';
import { WatermarkTracker } from './watermarkTracker.js';

export class PreCommitEngine {
    constructor() {
        this.graph = new GraphFraudEngine();
        this.zkp = new ZKPValidator();
        this.behavior = new BehaviorAnalyzer();
        this.watermark = new WatermarkTracker();
    }

    // Handles the staging layer logic for any incoming transaction
    processTransactionRequest(txPayload, userContext) {
        // txPayload: { from, to, amount, timestamp, ... }
        // userContext: { currentBalance, behaviorData: { isHeadless, clickSpeedMs, loginHour } }

        let errors = [];
        let explanations = [];

        // 1. ZKP Validation check (Is balance sufficient without exposing value openly in logs)
        const zkpRes = this.zkp.verifySufficientFunds(userContext.currentBalance || 0, txPayload.amount);
        if (!zkpRes.proofValid) {
            errors.push("ZKP_INSUFFICIENT_FUNDS");
            explanations.push("ZKP Engine: Transaction rejected due to cryptographic proof of insufficient funds.");
        }

        // 2. Behavioral Analytics check
        let behaviorScore = 0;
        if (userContext.behaviorData) {
            const bhvRes = this.behavior.analyze(txPayload.from, userContext.behaviorData);
            behaviorScore = bhvRes.behaviorRiskScore;
            if (bhvRes.anomalyDetected && bhvRes.behaviorRiskScore >= 70) {
                errors.push("BEHAVIORAL_ANOMALY");
                explanations.push(...bhvRes.explanation);
            }
        }

        // 3. Fraud Engine Pre-Check (Evaluate context before commit)
        // Check if destination is already marked HIGH risk
        const destAccount = this.graph.getAccountAnalysis(txPayload.to);
        if (destAccount && destAccount.riskCategory === 'HIGH') {
            errors.push("HIGH_RISK_DESTINATION");
            explanations.push("Graph Engine: The recipient account is flagged as a high-risk entity.");
        }

        let watermarkData = null;
        if (userContext.employeeId && userContext.sessionId) {
             watermarkData = this.watermark.generateWatermark(userContext.employeeId, userContext.sessionId);
        }

        // Output Result
        if (errors.length > 0) {
            return {
                transactionStatus: "blocked",
                reasons: explanations,
                proofValidation: zkpRes.proofValid,
                behaviorScore: behaviorScore,
                watermarkMetadata: watermarkData,
                postCommitFraudAlerts: []
            };
        }

        // Commit transaction to graph if approved
        const fraudAlerts = this.graph.addTransaction(txPayload);

        return {
            transactionStatus: "approved",
            reasons: ["All checks passed. Transaction committed."],
            proofValidation: zkpRes.proofValid,
            behaviorScore: behaviorScore,
            watermarkMetadata: watermarkData,
            postCommitFraudAlerts: fraudAlerts
        };
    }
}
