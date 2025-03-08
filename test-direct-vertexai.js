#!/usr/bin/env node

/**
 * Direct Vertex AI test script - bypasses the on-demand endpoint service
 */

import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const PROJECT_ID = process.env.PROJECT_ID || "plucky-weaver-450819-k7";
const LOCATION = process.env.LOCATION || "us-central1";
// Use the hepatic endpoint ID from the server.js configuration
const ENDPOINT_ID = "8159951878260523008";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// A minimal 1x1 transparent PNG image
const baseImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * Get authentication token for Google Cloud
 */
async function getAuthToken() {
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    return token;
}

/**
 * Make a direct prediction request to Vertex AI endpoint
 */
async function makePredictionRequest(format, payload) {
    try {
        console.log(`${colors.blue}Testing format: ${format}${colors.reset}`);
        console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
        
        // Get auth token
        const token = await getAuthToken();
        
        // Vertex AI endpoint URL
        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/${ENDPOINT_ID}:predict`;
        
        // Make the API call
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const status = response.status;
        let data;
        
        try {
            data = await response.json();
        } catch (e) {
            data = await response.text();
        }
        
        console.log(`${colors.cyan}Response (${status}):${colors.reset}`);
        if (typeof data === 'object') {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(data);
        }
        
        console.log(`${format}: ${status === 200 ? colors.green + 'SUCCESS' : colors.red + 'FAILED'}${colors.reset}`);
        console.log('-----------------------------------');
        
        return { status, data };
    } catch (error) {
        console.error(`${colors.red}Error:${colors.reset}`, error);
        console.log(`${format}: ${colors.red}FAILED${colors.reset}`);
        console.log('-----------------------------------');
        return { status: 500, error: error.message };
    }
}

/**
 * Main test function
 */
async function main() {
    console.log(`${colors.magenta}=== Testing Direct Vertex AI Calls with Different Formats ===${colors.reset}\n`);
    
    // Format 1: Standard Vertex AI prediction format with base64 content
    const format1 = {
        instances: [
            {
                content: baseImage
            }
        ]
    };
    
    // Format 2: Nested b64 field (common for Vertex AI)
    const format2 = {
        instances: [
            {
                content: {
                    b64: baseImage
                }
            }
        ]
    };
    
    // Format 3: With data URI prefix
    const format3 = {
        instances: [
            {
                content: `data:image/png;base64,${baseImage}`
            }
        ]
    };
    
    // Format 4: Using GCS URI approach
    // Note: This assumes an image has been uploaded to the bucket via the existing server code
    const format4 = {
        instances: [
            {
                content: "gs://vexus-ai-images-plucky-weaver-450819-k7-20250223131511/images/image_1741407818372.png"
            }
        ]
    };
    
    // Format 5: Using different outer structure
    const format5 = {
        instances: [
            {
                image: {
                    bytesBase64Encoded: baseImage
                }
            }
        ]
    };
    
    // Format 6: Structure based on AutoML Vision documentation
    const format6 = {
        instances: [
            {
                image_bytes: {
                    b64: baseImage
                }
            }
        ]
    };
    
    // Execute tests
    await makePredictionRequest('Format 1: Standard content', format1);
    await makePredictionRequest('Format 2: Nested b64 field', format2);
    await makePredictionRequest('Format 3: With data URI prefix', format3);
    await makePredictionRequest('Format 4: GCS URI approach', format4);
    await makePredictionRequest('Format 5: Different outer structure', format5);
    await makePredictionRequest('Format 6: AutoML Vision structure', format6);
    
    console.log(`\n${colors.green}Test completed!${colors.reset}`);
}

// Run the test
main().catch(error => {
    console.error(`${colors.red}Error in main:${colors.reset}`, error);
    process.exit(1);
}); 