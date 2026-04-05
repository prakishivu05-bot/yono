YONO Secure - Advanced Banking Fraud Intelligence Shield

 🚀 Project Overview

YONO Secure is a cutting-edge, multi-layered security evolution of the YONO banking application MVP. It is designed to proactively detect, trap, and record malicious activities in real-time. By integrating a multi-tiered security approach—including behavioral analytics, pre-commit transaction safety switches, and a persistent Shadow Honeypot—we protect legitimate users while actively deceiving attackers. 

When a persistent threat or fraudulent login pattern is confirmed, the attacker is seamlessly redirected to a mirrored "bait" environment (Honeypot). All malicious telemetry and actions within this environment are immutably anchored to the Polygon/Sepolia blockchain via IPFS for secure, decentralized forensic threat intelligence.
 ✨ Core Features

1. **Digital Twin Dashboard**: A high-fidelity, real-time monitoring interface streaming live user interactions, risk scores, and anomaly detection events.
2. **Behavioral Biometrics**: Analyzes keystrokes, navigation paths, and typing speeds to identify non-human (bot) or suspicious human behavior.
3. **Graph-Based Fraud Detection**: A deeply integrated pre-commit engine that analyzes transaction networks in real-time, detecting money laundering topologies and synthetic identity rings before a transaction is committed.
4. **Shadow Honeypot Redirection**: Upon consecutive failed authentications or high-risk scores, the session silently hands off into a fake banking environment containing mock balances and transactions.
5. **Decentralized Hacker Forensics**: Malicious telemetry (IPs, user agents, attempted actions, intercepted exploits) is bundled, uploaded to IPFS, and permanently anchored on-chain ensuring immutable, undeniable proof of the attack.
6. **Zero-Knowledge Proof (ZKP) Architecture**: Ensures selective validation of secure actions without revealing sensitive core data.

 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla JS, CSS3, Chart.js (for real-time dashboard plotting)
* **Backend**: Node.js, Express.js
* **Security Layer**: Custom Predictive Intelligence logic, Graph Pre-Commit Engine
* **Web3/Blockchain**: Polygon/Sepolia Network, Ethers.js, IPFS (Pinata)
* **Storage**: Local JSON databases for rapid MVP deployment and proof of concept

🚦 How to Run Locally

### Prerequisites
* Node.js v16+
* npm (Node Package Manager)

### Installation
1. Clone the repository: `git clone https://github.com/prakishivu05-bot/yono.git`
2. Navigate to the project directory: `cd yono`
3. Install dependencies: `npm install`
4. Start the Node Server: `npm run dev` or `node server.js`
5. Access the application:
   * **Main App**: `http://localhost:3000/yono.html`
   * **Digital Twin Dashboard**: `http://localhost:3000/dashboard.html`

## 🛡️ Demo Scenarios

1. **Legitimate User Flow**: Register a user with a 4-digit PIN. Login successfully and observe the Digital Twin dashboard stream normal behavior scores.
2. **Honeypot Trigger**: Attempt to login 3 times with an incorrect PIN. On the final attempt, the system will silently transition into the Honeypot mode displaying fake high-value balances.
3. **Forensic Recording**: While inside the Honeypot, attempt an admin exploit or fake transfer. The action will be captured, blocked, recorded on the mock ledger, and dispatched to the Polygon Layer-2 blockchain for decentralized logging.

## 🔗 Live URLs

* **GitHub Repository**: [https://github.com/prakishivu05-bot/yono](https://github.com/prakishivu05-bot/yono)
