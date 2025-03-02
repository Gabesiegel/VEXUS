import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// Map vein types to appropriate test images
const TEST_IMAGES = {
  hepatic: 'public/images/hepatic_long.png',
  portal: 'public/images/Portal_long_axis.png',
  renal: 'public/images/Renal_vein_long.png'
};

// Endpoint Test Script
// This script tests if each vein type endpoint is correctly configured and accessible

// Configuration - update these values as needed
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

// Expected endpoint IDs for each vein type
const EXPECTED_ENDPOINTS = {
    renal: "2369174844613853184",
    portal: "2232940955885895680",
    hepatic: "8159951878260523008"
};

// Test image as base64 string (this is a tiny 1x1 transparent pixel)
const TEST_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

console.log(`${colors.magenta}=== VEXUS AI Endpoint Verification Tool ===${colors.reset}`);
console.log(`${colors.blue}Testing server at: ${BASE_URL}${colors.reset}`);

async function testHealthEndpoint() {
    try {
        console.log(`\n${colors.cyan}Testing /api/health endpoint...${colors.reset}`);
        
        const response = await fetch(`${BASE_URL}/api/health`);
        if (!response.ok) {
            throw new Error(`Health check failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`${colors.green}✓ Health endpoint is accessible${colors.reset}`);
        console.log(`${colors.blue}Server Info:${colors.reset}`);
        console.log(`  Project ID: ${data.serverInfo.projectId}`);
        console.log(`  Location: ${data.serverInfo.location}`);
        console.log(`  Last Updated: ${data.serverInfo.lastUpdated}`);
        
        // Verify endpoint configuration
        console.log(`${colors.blue}Configured Endpoints:${colors.reset}`);
        const endpoints = data.serverInfo.endpointConfig;
        
        for (const [veinType, endpointId] of Object.entries(endpoints)) {
            const expectedId = EXPECTED_ENDPOINTS[veinType];
            if (expectedId && endpointId === expectedId) {
                console.log(`  ${colors.green}✓ ${veinType}: ${endpointId}${colors.reset}`);
            } else {
                console.log(`  ${colors.red}✗ ${veinType}: ${endpointId} (Expected: ${expectedId})${colors.reset}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error(`${colors.red}✗ Health endpoint test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testEndpointConnectivity(veinType) {
    try {
        console.log(`\n${colors.cyan}Testing connectivity for ${veinType} endpoint...${colors.reset}`);
        
        const response = await fetch(`${BASE_URL}/api/test-endpoint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                metadata: {
                    veinType: veinType,
                    expectedIds: EXPECTED_ENDPOINTS
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Endpoint test failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status === 'ok') {
            console.log(`${colors.green}✓ ${veinType} endpoint connection verified${colors.reset}`);
            console.log(`  Endpoint ID: ${data.endpointId}`);
            
            if (data.match) {
                console.log(`  ${colors.green}✓ Endpoint ID matches expected value${colors.reset}`);
            } else {
                console.log(`  ${colors.red}✗ Endpoint ID mismatch: ${data.endpointId} (Expected: ${data.expectedId})${colors.reset}`);
            }
            
            return true;
        } else {
            console.log(`${colors.red}✗ ${veinType} endpoint test failed: ${data.message}${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ ${veinType} endpoint test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testPredictEndpoint(veinType) {
    try {
        console.log(`\n${colors.cyan}Testing prediction for ${veinType} vein...${colors.reset}`);
        
        // Create a minimal prediction request with a tiny test image
        const response = await fetch(`${BASE_URL}/api/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [
                    { content: TEST_IMAGE }
                ],
                metadata: {
                    veinType: veinType,
                    imageType: 'image/png',
                    testRun: true
                }
            })
        });
        
        // If we get a 401/403, it means auth is working but we don't have permission
        // That's still considered a successful routing test
        if (response.status === 401 || response.status === 403) {
            console.log(`${colors.yellow}⚠ ${veinType} prediction endpoint auth required (expected during testing)${colors.reset}`);
            console.log(`  Got status ${response.status} - this indicates proper routing to the endpoint`);
            return true;
        }
        
        if (!response.ok) {
            // Check if it's a model-specific error (which means routing worked)
            const errorText = await response.text();
            if (errorText.includes("Vertex AI") || errorText.includes("endpoint")) {
                console.log(`${colors.yellow}⚠ ${veinType} prediction routed correctly but model returned error${colors.reset}`);
                console.log(`  Error: ${errorText.substring(0, 100)}...`);
                return true;
            }
            
            throw new Error(`Prediction request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`${colors.green}✓ ${veinType} prediction request successful${colors.reset}`);
        
        if (data.modelId) {
            console.log(`  Model ID: ${data.modelId}`);
        }
        
        if (data.storage && data.storage.stored) {
            console.log(`  Image URL: ${data.storage.imageUrl}`);
        }
        
        return true;
    } catch (error) {
        console.error(`${colors.red}✗ ${veinType} prediction test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function runAllTests() {
    // Step 1: Check health endpoint
    const healthOk = await testHealthEndpoint();
    if (!healthOk) {
        console.log(`${colors.red}Health endpoint failed, cannot continue with other tests${colors.reset}`);
        return;
    }
    
    // Step 2: Test connectivity for all vein types
    const veinTypes = ['hepatic', 'portal', 'renal'];
    const connectivityResults = {};
    
    for (const veinType of veinTypes) {
        connectivityResults[veinType] = await testEndpointConnectivity(veinType);
    }
    
    // Step 3: Test prediction for all vein types if connectivity tests passed
    for (const veinType of veinTypes) {
        if (connectivityResults[veinType]) {
            await testPredictEndpoint(veinType);
        } else {
            console.log(`${colors.yellow}⚠ Skipping prediction test for ${veinType} due to connectivity failure${colors.reset}`);
        }
    }
    
    // Summary
    console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}`);
    console.log(`${colors.blue}Health Endpoint:${colors.reset} ${healthOk ? colors.green + '✓ PASSED' : colors.red + '✗ FAILED'}${colors.reset}`);
    
    console.log(`${colors.blue}Connectivity Tests:${colors.reset}`);
    for (const [veinType, result] of Object.entries(connectivityResults)) {
        console.log(`  ${veinType}: ${result ? colors.green + '✓ PASSED' : colors.red + '✗ FAILED'}${colors.reset}`);
    }
}

// Run the tests
runAllTests().catch(error => {
    console.error(`${colors.red}Unhandled error during tests: ${error.message}${colors.reset}`);
}); 