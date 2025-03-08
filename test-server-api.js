#!/usr/bin/env node

/**
 * Simple test script to test the server's API endpoint directly
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVER_URL = 'http://localhost:3003';

// Function to test the API endpoint
async function testApiEndpoint() {
    try {
        console.log(`Testing API endpoint at ${SERVER_URL}/api/predict...`);
        
        // Read the test image
        const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');
        console.log(`Reading test image: ${imagePath}`);
        
        const imageBuffer = await fs.readFile(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        
        // Create the payload
        const payload = {
            instances: [
                {
                    content: imageBase64
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            },
            metadata: {
                veinType: 'hepatic',
                imageType: 'image/png',
                timestamp: Date.now()
            }
        };
        
        // Make the request
        const response = await fetch(`${SERVER_URL}/api/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('API response:', JSON.stringify(result, null, 2));
            return true;
        } else {
            const errorText = await response.text();
            console.error(`API request failed: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error('Error testing API endpoint:', error.message);
        return false;
    }
}

// Main function
async function main() {
    try {
        console.log("=== Testing Server API Endpoint ===");
        
        const success = await testApiEndpoint();
        
        if (success) {
            console.log("\n=== API endpoint test successful ===");
        } else {
            console.log("\n=== API endpoint test failed ===");
        }
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
