import { recordHackerTelemetry } from './blockchainService.js';

async function runTest() {
    console.log("Starting Real Blockchain & IPFS Test...");
    
    const mockHackerData = {
        userId: "REAL_TEST_HACKER_1",
        action: "login_brute_force",
        failedAttempts: 15,
        ip: "192.168.1.100",
        device: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        behaviorScore: 95,
        timestamp: new Date().toISOString()
    };

    const result = await recordHackerTelemetry(mockHackerData);

    if (result.success) {
        console.log("\n=============================================");
        console.log("✅ SUCCESS! DATA PERMANENTLY STORED!");
        console.log("=============================================");
        console.log("IPFS Tracker URL: https://gateway.pinata.cloud/ipfs/" + result.ipfsHash);
        console.log("Blockchain Explorer: https://sepolia.etherscan.io/tx/" + result.txHash);
        console.log("=============================================\n");
    } else {
        console.log("❌ FAILED:", result.error);
    }
}

runTest();
