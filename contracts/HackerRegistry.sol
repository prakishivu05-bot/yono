// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HackerRegistry
 * @dev A smart contract to permanently anchor hacker telemetry data.
 * The raw JSON (IP, device info, behavior score) is stored on IPFS,
 * and the resulting IPFS Hash is permanently logged here.
 */
contract HackerRegistry {
    address public admin;

    event HackerLogged(address indexed reporter, string ipfsHash, uint256 timestamp);

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Log an IPFS hash representing a hacker's footprint.
     * @param ipfsHash The CID returned from IPFS.
     */
    function logHackerBehavior(string memory ipfsHash) public {
        // We log the reporter address, the IPFS hash mapping to the evidence, and the block timestamp
        emit HackerLogged(msg.sender, ipfsHash, block.timestamp);
    }
}
