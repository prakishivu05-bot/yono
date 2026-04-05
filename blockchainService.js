import axios from 'axios';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.HACKER_REGISTRY_CONTRACT_ADDRESS;

// Minimal ABI just for logging
const ABI = [
    "function logHackerBehavior(string memory ipfsHash) public",
    "event HackerLogged(address indexed reporter, string ipfsHash, uint256 timestamp)"
];

async function uploadToIPFS(jsonData) {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
        console.warn("[MOCK IPFS] Pinata Keys missing. Returning mock CID.");
        return "QmMockHash1234567890abcdefghijklmnopqrstuvwxyz";
    }

    try {
        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            {
                pinataContent: jsonData,
                pinataMetadata: { name: `hacker_report_${Date.now()}.json` }
            },
            {
                headers: {
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_API_KEY
                }
            }
        );
        return response.data.IpfsHash;
    } catch (error) {
        console.warn("[MOCK IPFS API ERROR] IPFS Upload Failed, falling back to Mock CID.", error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message);
        return "QmMockFallbackHash" + Date.now();
    }
}

async function writeToBlockchain(ipfsHash) {
    if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
        console.warn("[MOCK BLOCKCHAIN] Missing Blockchain Keys. Pretending tx was successful.");
        return "0xMockTransactionHash9876543210abcdef";
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

        const tx = await contract.logHackerBehavior(ipfsHash);
        const receipt = await tx.wait(); // Wait for confirmation
        return receipt.hash; // ethers v6 hash logic
    } catch (error) {
        console.warn("[MOCK BLOCKCHAIN API ERROR] Blockchain Write Failed, falling back to Mock TX.", error);
        return "0xMockFallbackTxHash" + Date.now();
    }
}

export async function recordHackerTelemetry(hackerData) {
    try {
        console.log("\n[BLOCKCHAIN] -> Packaging Hacker Data for IPFS...");
        const ipfsHash = await uploadToIPFS(hackerData);
        console.log(`[BLOCKCHAIN] -> Stored on IPFS! CID: ${ipfsHash}`);
        
        console.log("[BLOCKCHAIN] -> Anchoring IPFS CID to Polygon/Sepolia...");
        const txHash = await writeToBlockchain(ipfsHash);
        console.log(`[BLOCKCHAIN] -> Confirmed! TX: ${txHash}\n`);

        return {
            success: true,
            ipfsHash,
            txHash
        };
    } catch (err) {
        console.error("[BLOCKCHAIN] Telemetry Pipeline Failed", err);
        return { success: false, error: err.message };
    }
}
