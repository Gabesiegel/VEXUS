#!/usr/bin/env node

/**
 * Complete end-to-end test script for the on-demand endpoint service
 * This tests both direct interaction with the service and through the web server
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVICE_URL = process.env.ON_DEMAND_ENDPOINT_SERVICE || 'https://endpoints-on-demand-456295042668.us-central1.run.app';
// Use explicit IPv4 address instead of localhost to avoid IPv6 resolution issues
const SERVER_URL = process.env.SERVER_URL || 'http://127.0.0.1:3002';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

/**
 * Call the on-demand endpoint service directly
 */
async function callDirectService(endpoint, payload) {
    try {
        console.log(`${colors.blue}Calling direct service ${endpoint}...${colors.reset}`);
        
        const response = await fetch(`${SERVICE_URL}${endpoint}`, {
            method: endpoint === '/health' ? 'GET' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: endpoint !== '/health' ? JSON.stringify(payload) : undefined
        });
        
        const status = response.status;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`${colors.blue}Response (${status}):${colors.reset}`);
            console.log(JSON.stringify(data, null, 2));
            return { status, data };
        } else {
            const text = await response.text();
            console.log(`${colors.blue}Response (${status}) - Not JSON:${colors.reset}`);
            console.log(text);
            return { status, text };
        }
    } catch (error) {
        console.error(`${colors.red}Error calling direct service:${colors.reset}`, error);
        return { status: 500, error: error.message };
    }
}

/**
 * Call the server API that uses the on-demand endpoint service
 */
async function callServerAPI(endpoint, payload) {
    try {
        console.log(`${colors.cyan}Calling server API ${endpoint}...${colors.reset}`);
        
        const response = await fetch(`${SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const status = response.status;
        const data = await response.json();
        
        console.log(`${colors.cyan}Response (${status}):${colors.reset}`);
        console.log(JSON.stringify(data, null, 2));
        
        return { status, data };
    } catch (error) {
        console.error(`${colors.red}Error calling server API:${colors.reset}`, error);
        return { status: 500, error: error.message };
    }
}

/**
 * Generate a test payload with a minimal image
 */
function generateTestPayload(veinType = 'hepatic') {
    // A minimal 1x1 transparent PNG image
    const baseImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    
    // For direct service, the content needs to be in the expected format for Vertex AI
    const directServicePayload = {
        instances: [
            {
                content: baseImage
            }
        ]
    };
    
    // For server API, we need to include metadata
    const serverApiPayload = {
        instances: [
            {
                content: baseImage
            }
        ],
        metadata: {
            veinType: veinType,
            imageType: 'image/png'
        }
    };
    
    // Return the appropriate payload based on the endpoint being called
    return {
        directService: directServicePayload,
        serverApi: serverApiPayload
    };
}

/**
 * Main test function
 */
async function main() {
    console.log(`${colors.magenta}=== Complete End-to-End Test for On-Demand Endpoint Service ====${colors.reset}`);
    
    try {
        // Step 1: Check if the server is running
        console.log(`\n${colors.yellow}[Step 1] Checking if server is running...${colors.reset}`);
        
        try {
            const response = await fetch(`${SERVER_URL}/`);
            if (response.ok) {
                console.log(`${colors.green}Server is running.${colors.reset}`);
            } else {
                console.log(`${colors.red}Server is running but returned status ${response.status}.${colors.reset}`);
            }
        } catch (error) {
            console.error(`${colors.red}Server is not running. Please start the server first.${colors.reset}`);
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
        
        // Step 2: Check on-demand service health
        console.log(`\n${colors.yellow}[Step 2] Checking on-demand service health...${colors.reset}`);
        const healthResult = await callDirectService('/health');
        
        if (healthResult.status !== 200) {
            console.error(`${colors.red}Health check failed. Exiting.${colors.reset}`);
            return;
        }
        
        // Step 3: Clean up any existing endpoints
        console.log(`\n${colors.yellow}[Step 3] Cleaning up any existing endpoints...${colors.reset}`);
        await callDirectService('/cleanup', {});
        
        // Step 4: Test direct prediction
        console.log(`\n${colors.yellow}[Step 4] Making a direct prediction request...${colors.reset}`);
        const payload = generateTestPayload();
        const directResult = await callDirectService('/predict/hepatic', payload.directService);
        
        // Step 5: Check if endpoint was created
        console.log(`\n${colors.yellow}[Step 5] Checking if endpoint was created...${colors.reset}`);
        const checkResult = await callDirectService('/health');
        
        // Step 6: Test server API integration
        console.log(`\n${colors.yellow}[Step 6] Testing server API integration...${colors.reset}`);
        const serverResult = await callServerAPI('/api/predict', payload.serverApi);
        
        // Step 7: Clean up all endpoints
        console.log(`\n${colors.yellow}[Step 7] Cleaning up all endpoints...${colors.reset}`);
        await callDirectService('/cleanup', {});
        
        console.log(`\n${colors.green}Test completed! ${colors.reset}`);
        
        // Summary
        console.log(`\n${colors.magenta}=== Test Summary ====${colors.reset}`);
        console.log(`${colors.yellow}Direct Service:${colors.reset} ${directResult.status === 200 ? colors.green + 'SUCCESS' : colors.red + 'FAILURE'}`);
        console.log(`${colors.yellow}Server Integration:${colors.reset} ${serverResult.status === 200 ? colors.green + 'SUCCESS' : colors.red + 'FAILURE'}`);
        console.log(`${colors.yellow}Endpoint Creation:${colors.reset} ${checkResult.data?.active_endpoints && Object.keys(checkResult.data.active_endpoints).length > 0 ? colors.green + 'SUCCESS' : colors.red + 'FAILURE'}`);
        console.log(`${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}Unhandled error in test:${colors.reset}`, error);
    }
}

// Run the test
main().catch(error => {
    console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
    process.exit(1);
}); 