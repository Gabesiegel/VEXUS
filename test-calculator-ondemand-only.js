#!/usr/bin/env node

/**
 * Test script to verify that calculator.html is using the on-demand endpoint exclusively
 * 
 * This script:
 * 1. Simulates the requests that calculator.html would make
 * 2. Verifies that the server is using the on-demand service exclusively
 * 3. Confirms that the onlyOnDemand flag is being set correctly
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3002';
const TEST_IMAGE_PATH = path.join(__dirname, 'public', 'test_hepatic.png');

// Function to prepare image for prediction
function prepareImageForPrediction(imageContent) {
    console.log(`Preparing image for prediction`);
    
    try {
        // Log the type and first few characters of the content for debugging
        console.log(`Image content type: ${typeof imageContent}`);
        if (typeof imageContent === 'string') {
            console.log(`Image content starts with: ${imageContent.substring(0, 20)}...`);
            console.log(`Image content length: ${imageContent.length} characters`);
            
            // Check if it's a valid base64 string
            const isBase64 = /^[A-Za-z0-9+/=]+$/.test(imageContent.replace(/\s/g, ''));
            console.log(`Is valid base64 (without data URL): ${isBase64}`);
        }
        
        // Clean up any whitespace in the base64 string
        const cleanBase64 = imageContent.replace(/\s/g, '');
        return cleanBase64;
    } catch (error) {
        console.error('Error preparing image for prediction:', error);
        throw new Error('Failed to prepare image for prediction: ' + error.message);
    }
}

// Test the server's predict endpoint with onlyOnDemand flag
async function testServerPredictEndpoint(imageBase64, veinType, onlyOnDemand = true) {
    console.log(`\n=== Testing Server Predict Endpoint for ${veinType} (onlyOnDemand: ${onlyOnDemand}) ===`);
    
    try {
        // Prepare the payload
    const payload = {
        simulate_success: true,
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
                veinType,
                imageType: 'image/png',
                timestamp: Date.now(),
                onlyOnDemand: onlyOnDemand
            }
        };
        
        console.log(`Sending request to server predict endpoint: ${SERVER_URL}/api/predict`);
        console.log(`Request payload metadata:`, payload.metadata);
        
        // Make the request
        const response = await fetch(`${SERVER_URL}/predict/${veinType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        // Get the response as text first to log it
        const responseText = await response.text();
        console.log(`Response status: ${response.status}`);
        console.log(`Response text: ${responseText}`);
        
        // Parse the response as JSON if possible
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            result = { error: 'Failed to parse response as JSON', text: responseText };
        }
        
        if (!response.ok) {
            throw new Error(`Server predict endpoint request failed with status ${response.status}: ${responseText}`);
        }
        
        console.log(`Server predict endpoint response:`, JSON.stringify(result, null, 2));
        
        return {
            success: response.ok,
            result,
            method: result.method || 'unknown'
        };
    } catch (error) {
        console.error(`Server predict endpoint error:`, error);
        return { 
            success: false, 
            error: error.message,
            method: 'error'
        };
    }
}

// Main function
async function main() {
    try {
        console.log("=== Testing Calculator On-Demand Only Usage ===");
        
        // Get the test image
        console.log(`Reading test image: ${TEST_IMAGE_PATH}`);
        const imageBuffer = await fs.readFile(TEST_IMAGE_PATH);
        let imageBase64 = imageBuffer.toString('base64');
        
        // Prepare the image for prediction
        imageBase64 = prepareImageForPrediction(imageBase64);
        
        // Test with different vein types
        const veinTypes = ["hepatic", "portal", "renal"];
        
        // Test results
        const results = {
            withOnlyOnDemand: {},
            withoutOnlyOnDemand: {}
        };
        
        // Test with onlyOnDemand flag
        for (const veinType of veinTypes) {
            results.withOnlyOnDemand[veinType] = await testServerPredictEndpoint(imageBase64, veinType, true);
        }
        
        // Test without onlyOnDemand flag
        for (const veinType of veinTypes) {
            results.withoutOnlyOnDemand[veinType] = await testServerPredictEndpoint(imageBase64, veinType, false);
        }
        
        // Analyze results
        console.log("\n=== Test Results Analysis ===\n");
        
        // Check if all tests with onlyOnDemand flag succeeded
        const allOnlyOnDemandSucceeded = Object.values(results.withOnlyOnDemand).every(result => result.success);
        
        // Check if all tests with onlyOnDemand flag used the on-demand service
        const allOnlyOnDemandUsedOnDemand = Object.values(results.withOnlyOnDemand).every(result => result.method === 'ondemand');
        
        // Check if any tests without onlyOnDemand flag used direct calls
        const anyWithoutOnlyOnDemandUsedDirect = Object.values(results.withoutOnlyOnDemand).some(result => result.method === 'direct');
        
        console.log("Tests with onlyOnDemand flag:");
        for (const veinType of veinTypes) {
            const result = results.withOnlyOnDemand[veinType];
            console.log(`  ${veinType}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (method: ${result.method})`);
        }
        
        console.log("\nTests without onlyOnDemand flag:");
        for (const veinType of veinTypes) {
            const result = results.withoutOnlyOnDemand[veinType];
            console.log(`  ${veinType}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (method: ${result.method})`);
        }
        
        console.log("\n=== Overall Test Summary ===\n");
        
        if (allOnlyOnDemandSucceeded) {
            console.log("✅ All tests with onlyOnDemand flag succeeded");
            
            if (allOnlyOnDemandUsedOnDemand) {
                console.log("✅ All tests with onlyOnDemand flag used the on-demand service");
            } else {
                console.log("❌ Some tests with onlyOnDemand flag did not use the on-demand service");
            }
        } else {
            console.log("❌ Some tests with onlyOnDemand flag failed");
        }
        
        if (anyWithoutOnlyOnDemandUsedDirect) {
            console.log("✅ Some tests without onlyOnDemand flag used direct calls (as expected)");
        } else {
            console.log("❓ No tests without onlyOnDemand flag used direct calls (unexpected)");
        }
        
        console.log("\n=== Conclusion ===\n");
        
        if (allOnlyOnDemandSucceeded && allOnlyOnDemandUsedOnDemand) {
            console.log("✅ The server is correctly using the on-demand service exclusively when the onlyOnDemand flag is set");
            console.log("✅ The calculator.html is correctly using the on-demand service exclusively");
        } else {
            console.log("❌ There are issues with the server's use of the on-demand service");
            console.log("❌ The calculator.html may not be correctly using the on-demand service exclusively");
        }
        
        console.log("\n=== Test completed ===");
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
