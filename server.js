import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DigitalTwinEngine } from './digitalTwin.js';
import fs from 'fs'; // To write the JSON ledger

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const twin = new DigitalTwinEngine();

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

app.post('/api/event', (req, res) => {
    // If the frontend says it's honeypot, or if the action looks like a hack
    const isHoneypot = req.body.isHoneypot || req.body.action.includes("'") || req.body.action.includes("admin");
    const mode = isHoneypot ? "honeypot" : "real";
    
    const result = twin.processEvent({ ...req.body, mode: mode });

    if (isHoneypot) {
        mineToLedger({
            userId: "Hacker_Identified",
            action: req.body.action,
            amount: req.body.amount,
            ip: req.body.ip,
            device: req.body.device
        });
    }
    res.json({ success: true, result });
});

app.listen(port, () => {
    console.log(`Digital Twin Server running at http://localhost:${port}`);
    console.log(`Access the Dashboard at: http://localhost:${port}/dashboard.html`);
});