import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DigitalTwinEngine } from './digitalTwin.js';
import { PreCommitEngine } from './preCommitEngine.js';
import { recordHackerTelemetry } from './blockchainService.js';
import fs from 'fs'; // To write the JSON ledger

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const twin = new DigitalTwinEngine();
const fraudEngine = new PreCommitEngine();
let txCounter = 1;

// --- DB Logic ---
const usersDbFile = './users.json';

function getUsersDB() {
    if (fs.existsSync(usersDbFile)) {
        try { return JSON.parse(fs.readFileSync(usersDbFile)); } catch(e) { return {}; }
    }
    return {};
}

function saveUsersDB(db) {
    fs.writeFileSync(usersDbFile, JSON.stringify(db, null, 2));
}

// Session state tracking in-memory (Maps phone to { failedAttempts, isHoneypot, sessionStart })
const sessionTracker = new Map();


// Redirect root to dashboard automatically
app.get('/', (req, res) => {
    res.redirect('/dashboard.html');
});

// Status Endpoint for Dashboard
app.get('/api/twin-status', (req, res) => {
    res.json(twin.getLatestState() || {
        userId: "Waiting...",
        riskScore: 0,
        anomaly: false,
        reasons: [],
        mode: "real"
    });
});
// Mock Blockchain Mining Function
function mineToLedger(data) {
    const filePath = './blockchain_ledger.json';
    let ledger = [];
    if (fs.existsSync(filePath)) {
        try { ledger = JSON.parse(fs.readFileSync(filePath)); } catch(e) { ledger = []; }
    }
    
    const newBlock = {
        blockId: ledger.length + 1,
        timestamp: new Date().toISOString(),
        data: data,
        prevHash: ledger.length > 0 ? ledger[ledger.length - 1].hash : "0000",
        hash: "0x" + Math.random().toString(16).slice(2, 10) // Mock Hash
    };
    
    ledger.push(newBlock);
    fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2));
    return newBlock;
}

// --- AUTHENTICATION API ---

app.post('/api/register', (req, res) => {
    const { name, phone, pin } = req.body;
    if (!name || !phone || !pin) return res.status(400).json({ error: 'Missing fields' });
    
    let db = getUsersDB();
    if (db[phone]) {
        return res.status(400).json({ error: 'Phone already registered' });
    }
    
    db[phone] = {
        name,
        phone,
        pin,
        balance: 154000.00,
        transactions: [
            {icon:'🛒',bg:'#E3F2FD',name:'BigBasket',date:'04 Apr 2026',type:'debit',amount:'₹1,248.00',bal:'₹1,24,580.00',ref:'UPI'},
            {icon:'💰',bg:'#E8F5E9',name:'Salary',date:'01 Apr 2026',type:'credit',amount:'₹65,000.00',bal:'₹1,25,828.00',ref:'NEFT'}
        ]
    };
    saveUsersDB(db);
    res.json({ success: true, message: 'Registered successfully' });
});

app.post('/api/login', (req, res) => {
    const { phone, pin, metrics } = req.body;
    
    // Enrich event with actual IP and User-Agent
    const clientIp = req.ip || req.connection.remoteAddress || req.body.ip || "127.0.0.1";
    const userAgent = req.get('User-Agent') || req.body.device || "Unknown";

    let session = sessionTracker.get(phone) || { failedAttempts: 0, isHoneypot: false, lastAttempt: null };

    const db = getUsersDB();
    const userProfile = db[phone];

    // Build event object for twin engine
    let timeSinceLast = session.lastAttempt ? (Date.now() - session.lastAttempt) : 5000;
    session.lastAttempt = Date.now();
    let enrichedMetrics = { ...metrics, timeBetweenAttemptsMs: timeSinceLast, failedAttemptsCount: session.failedAttempts };
    
    let twinEvent = {
        action: 'login_attempt',
        userId: userProfile ? userProfile.name : "Unknown",
        mode: session.isHoneypot ? 'honeypot' : 'real',
        ip: clientIp,
        device: userAgent,
        metrics: enrichedMetrics
    };

    // If session is already marked honeypot, skip real auth and stay trapped
    if (session.isHoneypot) {
        twinEvent.action = 'honeypot_login';
        twin.processEvent(twinEvent);
        return generateHoneypotResponse(res);
    }

    if (!userProfile) {
        return res.status(401).json({ error: 'User not found' });
    }

    if (userProfile.pin !== pin) {
        session.failedAttempts++;
        twinEvent.action = 'login_failed_attempt';
        enrichedMetrics.failedAttemptsCount = session.failedAttempts;
        
        let twinResponse = twin.processEvent(twinEvent);
        
        sessionTracker.set(phone, session);

        // Honeypot Decision Logic
        if (session.failedAttempts >= 3 && twinResponse.shouldFlagAsHoneypot) {
            session.isHoneypot = true;
            sessionTracker.set(phone, session);
            return res.json({ success: false, honeypotNext: true, message: 'Incorrect PIN. Try again.' });
        }

        return res.status(401).json({ error: `Incorrect PIN. Attempt ${session.failedAttempts}.` });
    }

    // Success login
    session.failedAttempts = 0;
    sessionTracker.set(phone, session);
    
    twinEvent.action = 'login_success';
    twin.processEvent(twinEvent);

    let clonedProfile = JSON.parse(JSON.stringify(userProfile));
    delete clonedProfile.pin; // Do not send PIN back safely
    res.json({ success: true, userProfile: clonedProfile, sessionToken: 'REAL_SESS_TOKEN' });
});

function generateHoneypotResponse(res) {
    let fakeProfile = {
        name: 'System Admin',
        phone: 'Unknown',
        balance: 500000.00,
        transactions: [
            {icon:'🚨',bg:'#FFEBEE',name:'Admin Setup',date:'Now',type:'credit',amount:'₹10,000.00',bal:'₹500k',ref:'SYS'}
        ]
    };
    res.json({ 
        success: true, 
        userProfile: fakeProfile, 
        sessionToken: 'HONEYPOT_SESS_TOKEN', 
        isHoneypotMode: true 
    });
}


app.post('/api/event', (req, res) => {
    let isHoneypot = req.body.isHoneypot || req.body.action.includes("'") || req.body.action.includes("admin");
    
    // Check if the current phone is mapped to a honeypot session
    if (req.body.phone && sessionTracker.has(req.body.phone) && sessionTracker.get(req.body.phone).isHoneypot) {
        isHoneypot = true;
    }
    
    const mode = isHoneypot ? "honeypot" : "real";
    
    // Enrich event with actual IP and User-Agent
    const clientIp = req.ip || req.connection.remoteAddress || req.body.ip || "127.0.0.1";
    const userAgent = req.get('User-Agent') || req.body.device || "Unknown";

    const result = twin.processEvent({ ...req.body, mode: mode, ip: clientIp, device: userAgent });

    if (isHoneypot) {
        mineToLedger({
            userId: "Hacker_Identified",
            action: req.body.action,
            amount: req.body.amount,
            ip: clientIp,
            device: userAgent
        });
        
        // Asynchronously dump true forensic data to Polygon/IPFS
        recordHackerTelemetry({
            userId: "Hacker_Identified",
            action: req.body.action,
            amount: req.body.amount,
            ip: clientIp,
            device: userAgent,
            timestamp: new Date().toISOString()
        }).then(result => {
             if (result && result.success) {
                 twin.pushBlockchainData(result.ipfsHash, result.txHash);
             }
        });
    }
    res.json({ success: true, result });
});

// --- FRAUD ENGINE & ADVANCED SECURITY ENDPOINTS ---

app.post('/transactions', (req, res) => {
    const { from, to, amount, timestamp, currentBalance, behaviorData, employeeId, sessionId } = req.body;
    
    if (!from || !to || amount === undefined) {
        return res.status(400).json({ error: "Missing required transaction fields (from, to, amount)" });
    }

    const txPayload = {
        id: "TX_" + (txCounter++),
        from,
        to,
        amount: Number(amount),
        timestamp: timestamp || Date.now()
    };

    const userContext = {
        currentBalance: currentBalance !== undefined ? currentBalance : Number(amount), 
        behaviorData,
        employeeId,
        sessionId
    };

    const result = fraudEngine.processTransactionRequest(txPayload, userContext);

    if (result.transactionStatus === "blocked") {
        recordHackerTelemetry({
            error_type: "PreCommit_Engine_Blocked",
            action: "fraudulent_transaction_attempt",
            amount: txPayload.amount,
            from: txPayload.from,
            to: txPayload.to,
            reasons: result.reasons,
            timestamp: new Date().toISOString()
        }).then(res => {
            if (res && res.success) {
                 twin.pushBlockchainData(res.ipfsHash, res.txHash);
            }
        });
    }

    return res.json(result);
});

app.get('/analyze', (req, res) => {
    const analysis = fraudEngine.graph.getFullAnalysis();
    return res.json(analysis);
});

app.get('/account/:id', (req, res) => {
    const accountData = fraudEngine.graph.getAccountAnalysis(req.params.id);
    if (!accountData) return res.status(404).json({ error: "Account not found in graph logic" });
    return res.json(accountData);
});

app.listen(port, () => {
    console.log(`Digital Twin Server running at http://localhost:${port}`);
    console.log(`Access the Dashboard at: http://localhost:${port}/dashboard.html`);
});