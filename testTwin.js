import { DigitalTwinEngine } from './digitalTwin.js';

const engine = new DigitalTwinEngine();

console.log("--- REAL USER MODE TESTS ---");
// Build baseline
const baseEvent = { userId: "user_123", ip: "192.168.1.1", device: "Desktop-Win10", amount: 100, mode: "real", action: "transfer", timestamp: Date.now() };

// Repeat to build consistency
for (let i = 0; i < 5; i++) {
  engine.processEvent({ ...baseEvent, timestamp: Date.now() + i*1000, amount: 95 + i });
}

// Expect Normal behavior
const normalEvent = { ...baseEvent, amount: 102, timestamp: Date.now() + 50000 };
let result = engine.processEvent(normalEvent);
console.log("Normal Event Result:", result);

// Expect Anomaly (Abnormally large amount)
const largeEvent = { ...baseEvent, amount: 5000, timestamp: Date.now() + 60000 };
result = engine.processEvent(largeEvent);
console.log("Large Amount Anomaly Result:", result);

// Expect Anomaly (New IP and Device)
const newLocEvent = { ...baseEvent, ip: "203.0.113.5", device: "Mobile-Unknown", timestamp: Date.now() + 70000 };
result = engine.processEvent(newLocEvent);
console.log("New IP/Device Anomaly Result:", result);

console.log("\n--- HONEYPOT MODE TESTS ---");
engine.processEvent({ userId: "attacker_001", ip: "10.0.0.5", action: "scan", mode: "honeypot", timestamp: Date.now() });
engine.processEvent({ userId: "attacker_001", ip: "10.0.0.5", action: "' OR 1=1 --", mode: "honeypot", timestamp: Date.now() + 10 });
engine.processEvent({ userId: "attacker_001", ip: "10.0.0.5", action: "admin_login", mode: "honeypot", timestamp: Date.now() + 20 });
engine.processEvent({ userId: "attacker_001", ip: "10.0.0.5", action: "scan", mode: "honeypot", timestamp: Date.now() + 30 });
engine.processEvent({ userId: "attacker_001", ip: "10.0.0.5", action: "scan", mode: "honeypot", timestamp: Date.now() + 40 });
// 6th event in < 10 seconds -> triggers rapid request rate (stricter limit due to risk score from previous events)
result = engine.processEvent({ userId: "attacker_001", ip: "10.0.0.5", action: "scan", mode: "honeypot", timestamp: Date.now() + 50 });

console.log("Attacker Event Result:", result);

console.log("\n--- LOGS SUMMARY ---");
const logs = engine.getLogs();
console.log(`Normal: ${logs.normalLogs.length}, Anomaly: ${logs.anomalyLogs.length}, Attacker: ${logs.attackerLogs.length}`);

console.log("\n--- ATTACKER PROFILE ---");
console.log(JSON.stringify(engine.getAttackerProfile("attacker_001"), null, 2));
