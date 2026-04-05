import { PreCommitEngine } from './preCommitEngine.js';

const engine = new PreCommitEngine();

let success = true;

const logRes = (name, res, expectedStatus) => {
    if (res.transactionStatus !== expectedStatus) {
        console.error(`FAILED: ${name} Expected ${expectedStatus}, got ${res.transactionStatus}`);
        success = false;
    } else {
        console.log(`PASS: ${name}`);
    }
};

let txPayload1 = { id: 'T1', from: 'A', to: 'B', amount: 5000, timestamp: Date.now() };
let ctx1 = { currentBalance: 10000 };
let res1 = engine.processTransactionRequest(txPayload1, ctx1);
logRes("Tx1 (Normal)", res1, "approved");

let txPayload2 = { id: 'T2', from: 'A', to: 'C', amount: 5000, timestamp: Date.now() + 1000 };
let ctx2 = { currentBalance: 5000, behaviorData: { isHeadless: true } }; 
let res2 = engine.processTransactionRequest(txPayload2, ctx2);
logRes("Tx2 (Behavior Block - Headless)", res2, "blocked");

let ctx3 = { currentBalance: -1000 };
let res3 = engine.processTransactionRequest(txPayload2, ctx3);
logRes("Tx3 (ZKP Fail - Insufficient funds)", res3, "blocked");

engine.processTransactionRequest({ from: 'B', to: 'D', amount: 5000, timestamp: Date.now() + 3000 }, { currentBalance: 5000 });
let analysis = engine.graph.getFullAnalysis();
if (!analysis.rapidTransferChains.includes('B')) {
    console.error("FAILED: Rapid Transfer Not Detected");
    success = false;
} else {
    console.log("PASS: Rapid Transfer Detected");
}

engine.processTransactionRequest({ from: 'D', to: 'A', amount: 5000, timestamp: Date.now() + 5000 }, { currentBalance: 5000 });
analysis = engine.graph.getFullAnalysis();
if (!analysis.loopsDetected.includes('D') && !analysis.loopsDetected.includes('A')) {
    console.error("FAILED: Loop Not Detected");
    success = false;
} else {
    console.log("PASS: Loop Detected");
}

let smurfingEngine = new PreCommitEngine();
smurfingEngine.processTransactionRequest({ from: 'S', to: 'X', amount: 100, timestamp: Date.now() }, { currentBalance: 1000 });
smurfingEngine.processTransactionRequest({ from: 'S', to: 'Y', amount: 100, timestamp: Date.now() }, { currentBalance: 1000 });
let smurfRes = smurfingEngine.processTransactionRequest({ from: 'S', to: 'Z', amount: 100, timestamp: Date.now() }, { currentBalance: 1000 });
let smurfAnalysis = smurfingEngine.graph.getFullAnalysis();
if (!smurfAnalysis.smurfingAccounts.includes('S')) {
    console.error("FAILED: Smurfing Not Detected");
    success = false;
} else {
    console.log("PASS: Smurfing Detected");
}

if (success) {
    console.log("ALL TESTS PASSED SUCCESSFULLY");
}
