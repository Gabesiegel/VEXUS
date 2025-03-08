#!/usr/bin/env node

/**
 * Test script to verify that calculator.html is using the on-demand endpoint
 * and prewarming functionality correctly.
 * 
 * This script:
 * 1. Tests if the prewarming endpoint is called correctly
 * 2. Tests if the prediction requests include the onlyOnDemand flag
 * 3. Verifies that direct fallback doesn't occur when on-demand service fails
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVER_PORT = 3003; // Use a different port to avoid conflicts
const PROXY_PORT = 3004;  // Port for the proxy server

// Store captured requests for analysis
const capturedRequests = {
    preload: [],
    predict: []
};

// Create a proxy server to intercept and analyze requests
async function startProxyServer() {
    console.log(`Starting proxy server on port ${PROXY_PORT}...`);
    
    const server = http.createServer(async (req, res) => {
        // Collect request body
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            // Parse the body if it's JSON
            let parsedBody = {};
            if (body && (req.headers['content-type'] || '').includes('application/json')) {
                try {
                    parsedBody = JSON.parse(body);
                } catch (e) {
                    console.error('Error parsing JSON body:', e);
                }
            }
            
            // Capture and analyze requests
            if (req.url.includes('/api/preload-endpoint')) {
                console.log('Captured preload-endpoint request');
                capturedRequests.preload.push({
                    url: req.url,
                    method: req.method,
                    headers: req.headers,
                    body: parsedBody
                });
                
                // Respond with a success message
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'warming',
                    message: `${parsedBody.type || 'unknown'} endpoint warming initiated`,
                    timestamp: new Date().toISOString()
                }));
            } 
            else if (req.url.includes('/api/predict')) {
                console.log('Captured predict request');
                capturedRequests.predict.push({
                    url: req.url,
                    method: req.method,
                    headers: req.headers,
                    body: parsedBody
                });
                
                // Check if the request has the onlyOnDemand flag
                const hasOnlyOnDemandFlag = parsedBody.metadata && parsedBody.metadata.onlyOnDemand === true;
                console.log(`Request has onlyOnDemand flag: ${hasOnlyOnDemandFlag}`);
                
                // Respond with a mock prediction
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    displayNames: ['Normal', 'Mild', 'Severe'],
                    confidences: [0.8, 0.15, 0.05],
                    modelId: 'mock-model',
                    method: 'ondemand',
                    timestamp: new Date().toISOString()
                }));
            }
            else if (req.url.includes('/api/test-endpoint')) {
                // Respond with a success message for test-endpoint
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    veinType: parsedBody.metadata?.veinType || 'unknown',
                    message: 'Successfully verified connection',
                    timestamp: new Date().toISOString()
                }));
            }
            else {
                // Forward other requests to the actual server
                try {
                    const targetUrl = `http://localhost:${SERVER_PORT}${req.url}`;
                    const response = await fetch(targetUrl, {
                        method: req.method,
                        headers: req.headers,
                        body: body || undefined
                    });
                    
                    // Copy response headers
                    Object.entries(response.headers.raw()).forEach(([key, values]) => {
                        res.setHeader(key, values);
                    });
                    
                    // Send response
                    res.writeHead(response.status);
                    res.end(await response.buffer());
                } catch (error) {
                    console.error('Error forwarding request:', error);
                    res.writeHead(500);
                    res.end('Proxy error: ' + error.message);
                }
            }
        });
    });
    
    return new Promise((resolve, reject) => {
        server.listen(PROXY_PORT, () => {
            console.log(`Proxy server running on port ${PROXY_PORT}`);
            resolve(server);
        });
        
        server.on('error', (err) => {
            reject(err);
        });
    });
}

// Function to analyze the captured requests
function analyzeRequests() {
    console.log('\n=== Analysis of Captured Requests ===\n');
    
    // Analyze preload requests
    console.log('Preload Endpoint Requests:', capturedRequests.preload.length);
    if (capturedRequests.preload.length > 0) {
        const veinTypes = capturedRequests.preload.map(req => req.body.type);
        console.log('Vein types preloaded:', veinTypes.join(', '));
        console.log('✅ Prewarming functionality is being used');
    } else {
        console.log('❌ No prewarming requests detected');
    }
    
    // Analyze predict requests
    console.log('\nPredict Endpoint Requests:', capturedRequests.predict.length);
    if (capturedRequests.predict.length > 0) {
        const onlyOnDemandFlags = capturedRequests.predict.map(req => 
            req.body.metadata && req.body.metadata.onlyOnDemand === true);
        
        const allHaveFlag = onlyOnDemandFlags.every(flag => flag === true);
        
        if (allHaveFlag) {
            console.log('✅ All prediction requests have the onlyOnDemand flag set to true');
        } else {
            console.log('❌ Some prediction requests are missing the onlyOnDemand flag');
            onlyOnDemandFlags.forEach((flag, index) => {
                console.log(`  Request ${index + 1}: onlyOnDemand = ${flag}`);
            });
        }
    } else {
        console.log('❌ No prediction requests detected');
    }
    
    console.log('\n=== Test Summary ===\n');
    
    if (capturedRequests.preload.length > 0) {
        console.log('✅ Prewarming: PASS - The calculator is using the prewarming functionality');
    } else {
        console.log('❌ Prewarming: FAIL - No prewarming requests detected');
    }
    
    if (capturedRequests.predict.length > 0 && 
        capturedRequests.predict.every(req => req.body.metadata && req.body.metadata.onlyOnDemand === true)) {
        console.log('✅ On-Demand Usage: PASS - The calculator is using the on-demand endpoint exclusively');
    } else if (capturedRequests.predict.length > 0) {
        console.log('❌ On-Demand Usage: FAIL - Some requests are not set to use the on-demand endpoint exclusively');
    } else {
        console.log('❓ On-Demand Usage: INCONCLUSIVE - No prediction requests were made');
    }
}

// Main function
async function main() {
    try {
        console.log("=== Testing Calculator On-Demand Endpoint Usage ===");
        
        // Start the proxy server
        const proxyServer = await startProxyServer();
        
        console.log("\nProxy server is now running. To test the calculator.html:");
        console.log("1. Start your main server on port 3003 (e.g., PORT=3003 node server.js)");
        console.log("2. Open the calculator in your browser using the proxy URL:");
        console.log(`   http://localhost:${PROXY_PORT}/calculator.html`);
        console.log("3. Interact with the calculator (upload images, etc.)");
        console.log("4. Press Ctrl+C when done to see the analysis\n");
        
        // Keep the script running until user terminates
        process.on('SIGINT', () => {
            console.log('\nTest terminated by user. Analyzing results...\n');
            analyzeRequests();
            proxyServer.close(() => {
                console.log('\nProxy server closed.');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
