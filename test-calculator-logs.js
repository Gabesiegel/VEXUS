#!/usr/bin/env node

/**
 * Simple test script to check server logs for evidence that calculator.html
 * is using the on-demand endpoint and prewarming functionality.
 * 
 * This script:
 * 1. Monitors the server log file for prewarming and prediction requests
 * 2. Analyzes the logs to verify on-demand endpoint usage and prewarming
 */

import fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOG_FILE = path.join(__dirname, 'server.log');
const SERVER_DEBUG_LOG = path.join(__dirname, 'server_debug.log');

// Store captured log entries for analysis
const capturedLogs = {
    preload: [],
    predict: [],
    ondemand: [],
    direct: []
};

// Function to monitor a log file for new entries
async function monitorLogFile(logFile) {
    console.log(`Monitoring log file: ${logFile}`);
    
    try {
        // Check if the log file exists
        try {
            await fs.access(logFile);
        } catch (error) {
            console.log(`Log file ${logFile} does not exist yet. Waiting for it to be created...`);
        }
        
        // Get the current size of the log file (if it exists)
        let currentSize = 0;
        try {
            const stats = await fs.stat(logFile);
            currentSize = stats.size;
        } catch (error) {
            // File doesn't exist yet, start from beginning when it's created
        }
        
        // Function to check for new log entries
        const checkForNewEntries = async () => {
            try {
                // Check if the file exists now
                try {
                    await fs.access(logFile);
                } catch (error) {
                    // File still doesn't exist, try again later
                    return;
                }
                
                // Get the current size of the log file
                const stats = await fs.stat(logFile);
                const newSize = stats.size;
                
                // If the file has grown, read the new content
                if (newSize > currentSize) {
                    const stream = createReadStream(logFile, {
                        start: currentSize,
                        end: newSize - 1
                    });
                    
                    const rl = readline.createInterface({
                        input: stream,
                        crlfDelay: Infinity
                    });
                    
                    // Process each new line
                    for await (const line of rl) {
                        processLogLine(line);
                    }
                    
                    // Update the current size
                    currentSize = newSize;
                }
            } catch (error) {
                console.error('Error checking for new log entries:', error);
            }
        };
        
        // Check for new entries every second
        return setInterval(checkForNewEntries, 1000);
    } catch (error) {
        console.error('Error monitoring log file:', error);
        throw error;
    }
}

// Function to process a log line
function processLogLine(line) {
    // Check for preload endpoint requests
    if (line.includes('/api/preload-endpoint') || line.includes('prewarming') || line.includes('warming')) {
        console.log('🔍 Found preload endpoint log:', line);
        capturedLogs.preload.push(line);
    }
    
    // Check for predict endpoint requests
    if (line.includes('/api/predict')) {
        console.log('🔍 Found predict endpoint log:', line);
        capturedLogs.predict.push(line);
        
        // Check if it's using the on-demand service
        if (line.includes('onlyOnDemand') || line.includes('Only using on-demand service')) {
            console.log('✅ Request is using on-demand service exclusively');
            capturedLogs.ondemand.push(line);
        }
    }
    
    // Check for direct Vertex AI calls
    if (line.includes('Falling back to direct Vertex AI call') || 
        line.includes('direct call') || 
        line.includes('method: direct')) {
        console.log('⚠️ Found direct Vertex AI call log:', line);
        capturedLogs.direct.push(line);
    }
}

// Function to analyze the captured logs
function analyzeLogs() {
    console.log('\n=== Analysis of Captured Logs ===\n');
    
    // Analyze preload logs
    console.log('Preload Endpoint Logs:', capturedLogs.preload.length);
    if (capturedLogs.preload.length > 0) {
        console.log('Sample preload logs:');
        capturedLogs.preload.slice(0, 3).forEach(log => {
            console.log(`  - ${log}`);
        });
        console.log('✅ Prewarming functionality is being used');
    } else {
        console.log('❌ No prewarming logs detected');
    }
    
    // Analyze predict logs
    console.log('\nPredict Endpoint Logs:', capturedLogs.predict.length);
    if (capturedLogs.predict.length > 0) {
        console.log('Sample predict logs:');
        capturedLogs.predict.slice(0, 3).forEach(log => {
            console.log(`  - ${log}`);
        });
    } else {
        console.log('❌ No prediction logs detected');
    }
    
    // Analyze on-demand logs
    console.log('\nOn-Demand Service Logs:', capturedLogs.ondemand.length);
    if (capturedLogs.ondemand.length > 0) {
        console.log('Sample on-demand logs:');
        capturedLogs.ondemand.slice(0, 3).forEach(log => {
            console.log(`  - ${log}`);
        });
    }
    
    // Analyze direct call logs
    console.log('\nDirect Vertex AI Call Logs:', capturedLogs.direct.length);
    if (capturedLogs.direct.length > 0) {
        console.log('⚠️ Direct Vertex AI calls detected:');
        capturedLogs.direct.slice(0, 3).forEach(log => {
            console.log(`  - ${log}`);
        });
    } else {
        console.log('✅ No direct Vertex AI calls detected');
    }
    
    console.log('\n=== Test Summary ===\n');
    
    if (capturedLogs.preload.length > 0) {
        console.log('✅ Prewarming: PASS - The calculator is using the prewarming functionality');
    } else {
        console.log('❌ Prewarming: FAIL - No prewarming logs detected');
    }
    
    if (capturedLogs.predict.length > 0) {
        if (capturedLogs.direct.length === 0) {
            console.log('✅ On-Demand Usage: PASS - No direct Vertex AI calls detected');
        } else {
            console.log('❌ On-Demand Usage: FAIL - Direct Vertex AI calls detected');
        }
    } else {
        console.log('❓ On-Demand Usage: INCONCLUSIVE - No prediction logs were detected');
    }
}

// Main function
async function main() {
    try {
        console.log("=== Testing Calculator On-Demand Endpoint Usage via Logs ===");
        
        // Start monitoring the log files
        const serverLogInterval = await monitorLogFile(LOG_FILE);
        const serverDebugLogInterval = await monitorLogFile(SERVER_DEBUG_LOG);
        
        console.log("\nLog monitoring is now active. To test the calculator.html:");
        console.log("1. Start your server (e.g., node server.js)");
        console.log("2. Open the calculator in your browser:");
        console.log("   http://localhost:3002/calculator.html");
        console.log("3. Interact with the calculator (upload images, etc.)");
        console.log("4. Press Ctrl+C when done to see the analysis\n");
        
        // Keep the script running until user terminates
        process.on('SIGINT', () => {
            console.log('\nTest terminated by user. Analyzing logs...\n');
            clearInterval(serverLogInterval);
            clearInterval(serverDebugLogInterval);
            analyzeLogs();
            process.exit(0);
        });
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
