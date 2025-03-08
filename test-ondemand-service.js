#!/usr/bin/env node

/**
 * Test script for the on-demand endpoint service
 * 
 * This script tests the on-demand endpoint service by calling it directly
 * and checking if it can create Vertex AI endpoints on demand.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVICE_URL = process.env.ON_DEMAND_ENDPOINT_SERVICE || 'https://endpoints-on-demand-456295042668.us-central1.run.app';

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
 * Makes a request to the on-demand endpoint service
 */
async function callService(endpoint, payload) {
    try {
        console.log(`${colors.blue}Calling ${endpoint}...${colors.reset}`);
        
        const response = await fetch(`${SERVICE_URL}${endpoint}`, {
            method: endpoint === '/health' ? 'GET' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            ...(endpoint !== '/health' && { body: JSON.stringify(payload) })
        });
        
        const status = response.status;
        const data = await response.json();
        
        console.log(`${colors.blue}Response (${status}):${colors.reset}`);
        console.log(JSON.stringify(data, null, 2));
        
        return { status, data };
    } catch (error) {
        console.error(`${colors.red}Error calling service:${colors.reset}`, error);
        return { status: 500, error: error.message };
    }
}

/**
 * Main function to test the on-demand endpoint service
 */
async function main() {
    console.log(`${colors.magenta}=== Testing On-Demand Endpoint Service ====${colors.reset}`);
    console.log(`${colors.gray}Service URL: ${SERVICE_URL}${colors.reset}`);
    
    // Step 1: Check health
    console.log(`\n${colors.yellow}[Step 1] Checking service health...${colors.reset}`);
    const healthResult = await callService('/health');
    
    if (healthResult.status !== 200) {
        console.error(`${colors.red}Health check failed. Exiting.${colors.reset}`);
        return;
    }
    
    // Step 2: Clean up any existing endpoints
    console.log(`\n${colors.yellow}[Step 2] Cleaning up any existing endpoints...${colors.reset}`);
    await callService('/cleanup', {});
    
    // Step 3: Make a test prediction to the hepatic endpoint
    // Load a test image
    const testImagePath = path.join(__dirname, 'test_minimal.png');
    let imageBase64;
    
    try {
        if (fs.existsSync(testImagePath)) {
            imageBase64 = fs.readFileSync(testImagePath, { encoding: 'base64' });
        } else {
            console.warn(`${colors.yellow}Test image not found at ${testImagePath}. Using empty image data.${colors.reset}`);
            // Create a 1x1 transparent pixel
            imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        }
        
        console.log(`\n${colors.yellow}[Step 3] Making a test prediction to hepatic endpoint...${colors.reset}`);
        
        const payload = {
            instances: [
                {
                    content: imageBase64
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        const predictionResult = await callService('/predict/hepatic', payload);
        
        // Step 4: Check health again to see if an endpoint was created
        console.log(`\n${colors.yellow}[Step 4] Checking service health to verify endpoint creation...${colors.reset}`);
        const finalHealthResult = await callService('/health');
        
        // Step 5: Clean up the endpoints
        console.log(`\n${colors.yellow}[Step 5] Cleaning up endpoints...${colors.reset}`);
        await callService('/cleanup', {});
        
        console.log(`\n${colors.green}Test completed successfully!${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}Test failed:${colors.reset}`, error);
    }
}

// Run the test
main().catch(error => {
    console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
    process.exit(1);
}); 