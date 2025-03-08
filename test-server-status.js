#!/usr/bin/env node

/**
 * Test script to check if the server is running
 */

import fetch from 'node-fetch';

// Configuration
const SERVER_URL = 'http://localhost:3002';

// Function to check if the server is running
async function checkServerStatus() {
    try {
        console.log(`Checking if server is running at ${SERVER_URL}...`);
        
        const response = await fetch(`${SERVER_URL}/api/health`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Server is running!');
            console.log('Health check response:', JSON.stringify(data, null, 2));
            return true;
        } else {
            console.error(`Server returned status ${response.status}`);
            console.error('Response:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('Error checking server status:', error.message);
        return false;
    }
}

// Main function
async function main() {
    try {
        console.log("=== Checking Server Status ===");
        
        const isRunning = await checkServerStatus();
        
        if (isRunning) {
            console.log("\n=== Server is running ===");
        } else {
            console.log("\n=== Server is not running ===");
            console.log("Starting server...");
            console.log("Run the following command to start the server:");
            console.log("node server.js");
        }
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
