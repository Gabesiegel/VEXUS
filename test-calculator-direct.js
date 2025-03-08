#!/usr/bin/env node

/**
 * Direct test script to verify that calculator.html is using the on-demand endpoint
 * and prewarming functionality correctly.
 * 
 * This script:
 * 1. Directly tests the server's API endpoints
 * 2. Simulates the requests that calculator.html would make
 * 3. Verifies that the server is handling the requests correctly
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
const TEST_IMAGE_PATH = path.join(__dirname, 'public', 'test_image.png');

// Test results
const testResults = {
    prewarming: {
        hepatic: { success: false, response: null, error: null },
        portal: { success: false, response: null, error: null },
        renal: { success: false, response: null, error: null }
    },
    prediction: {
        hepatic: { success: false, response: null, error: null, usesOnDemand: false },
        portal: { success: false, response: null, error: null, usesOnDemand: false },
        renal: { success: false, response: null, error: null, usesOnDemand: false }
    }
};

// Function to test prewarming endpoint
async function testPrewarmingEndpoint(veinType) {
    console.log(`Testing prewarming endpoint for ${veinType} vein...`);
    
    try {
        const response = await fetch(`${SERVER_URL}/api/preload-endpoint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: veinType })
        });
        
        const data = await response.json();
        
        console.log(`Prewarming response for ${veinType}:`, data);
        
        testResults.prewarming[veinType].success = response.ok;
        testResults.prewarming[veinType].response = data;
        
        return data;
    } catch (error) {
        console.error(`Error testing prewarming endpoint for ${veinType}:`, error);
        testResults.prewarming[veinType].error = error.message;
        return null;
    }
}

// Function to test prediction endpoint
async function testPredictionEndpoint(veinType, imageBase64) {
    console.log(`Testing prediction endpoint for ${veinType} vein...`);
    
    try {
        // Create the payload with onlyOnDemand flag
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
                veinType: veinType,
                imageType: 'image/png',
                timestamp: Date.now(),
                onlyOnDemand: true // This is what we're testing
            },
            // Add content directly as well (some server implementations expect it here)
            content: imageBase64
        };
        
        // Make the prediction request
        const response = await fetch(`${SERVER_URL}/api/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        console.log(`Prediction response for ${veinType}:`, data);
        
        testResults.prediction[veinType].success = response.ok;
        testResults.prediction[veinType].response = data;
        
        // Check if the response indicates it used the on-demand service
        if (data.method === 'ondemand') {
            testResults.prediction[veinType].usesOnDemand = true;
        }
        
        return data;
    } catch (error) {
        console.error(`Error testing prediction endpoint for ${veinType}:`, error);
        testResults.prediction[veinType].error = error.message;
        return null;
    }
}

// Function to analyze test results
function analyzeResults() {
    console.log('\n=== Test Results Analysis ===\n');
    
    // Analyze prewarming results
    console.log('Prewarming Endpoint Tests:');
    let prewarmingSuccess = true;
    
    for (const veinType of ['hepatic', 'portal', 'renal']) {
        const result = testResults.prewarming[veinType];
        
        if (result.success) {
            console.log(`  ✅ ${veinType}: SUCCESS`);
            
            // Check if the response indicates warming
            if (result.response && 
                (result.response.status === 'warming' || 
                 (result.response.message && result.response.message.includes('warming')))) {
                console.log(`     Response indicates endpoint warming`);
            }
        } else {
            console.log(`  ❌ ${veinType}: FAILED - ${result.error || 'Unknown error'}`);
            prewarmingSuccess = false;
        }
    }
    
    // Analyze prediction results
    console.log('\nPrediction Endpoint Tests:');
    let predictionSuccess = true;
    let onDemandUsage = true;
    
    for (const veinType of ['hepatic', 'portal', 'renal']) {
        const result = testResults.prediction[veinType];
        
        if (result.success) {
            console.log(`  ✅ ${veinType}: SUCCESS`);
            
            // Check if the response indicates on-demand usage
            if (result.usesOnDemand) {
                console.log(`     Response indicates on-demand service was used`);
            } else {
                console.log(`     ⚠️ Response does not indicate on-demand service was used`);
                onDemandUsage = false;
            }
        } else {
            console.log(`  ❌ ${veinType}: FAILED - ${result.error || 'Unknown error'}`);
            predictionSuccess = false;
        }
    }
    
    // Overall summary
    console.log('\n=== Overall Test Summary ===\n');
    
    if (prewarmingSuccess) {
        console.log('✅ Prewarming: PASS - All prewarming endpoint tests succeeded');
    } else {
        console.log('❌ Prewarming: FAIL - Some prewarming endpoint tests failed');
    }
    
    if (predictionSuccess) {
        if (onDemandUsage) {
            console.log('✅ On-Demand Usage: PASS - All prediction responses indicate on-demand service was used');
        } else {
            console.log('⚠️ On-Demand Usage: PARTIAL - Some prediction responses do not indicate on-demand service was used');
        }
    } else {
        console.log('❌ On-Demand Usage: FAIL - Some prediction endpoint tests failed');
    }
}

// Main function
async function main() {
    try {
        console.log("=== Testing Calculator On-Demand Endpoint Usage ===");
        console.log(`Server URL: ${SERVER_URL}`);
        
        // Read the test image
        console.log(`Reading test image: ${TEST_IMAGE_PATH}`);
        const imageBuffer = await fs.readFile(TEST_IMAGE_PATH);
        const imageBase64 = imageBuffer.toString('base64');
        
        // Test prewarming endpoints
        for (const veinType of ['hepatic', 'portal', 'renal']) {
            await testPrewarmingEndpoint(veinType);
        }
        
        // Test prediction endpoints
        for (const veinType of ['hepatic', 'portal', 'renal']) {
            await testPredictionEndpoint(veinType, imageBase64);
        }
        
        // Analyze results
        analyzeResults();
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
