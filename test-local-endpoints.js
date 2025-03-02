// Local Endpoint Test Script
// This script tests if each endpoint is properly defined in the server
// without requiring connectivity to Google Cloud services

import fetch from 'node-fetch';

// Configuration
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

// Expected endpoint IDs for each vein type
const EXPECTED_ENDPOINTS = {
    renal: "2369174844613853184",
    portal: "2232940955885895680",
    hepatic: "8159951878260523008"
};

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

console.log(`${colors.magenta}=== VEXUS Local Endpoint Test Tool ===${colors.reset}`);
console.log(`${colors.blue}Testing server at: ${BASE_URL}${colors.reset}`);

// Test health endpoint
async function testHealthEndpoint() {
    try {
        console.log(`\n${colors.cyan}Testing /api/health endpoint...${colors.reset}`);
        
        const response = await fetch(`${BASE_URL}/api/health`);
        
        console.log(`${colors.blue}Response status:${colors.reset} ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`${colors.green}✓ Health endpoint is responding${colors.reset}`);
            console.log(JSON.stringify(data, null, 2));
            return true;
        } else {
            const text = await response.text();
            console.log(`${colors.red}✗ Health endpoint returned error: ${response.status}${colors.reset}`);
            console.log(text);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ Health endpoint test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

// Test local health endpoint
async function testLocalHealthEndpoint() {
    try {
        console.log(`\n${colors.cyan}Testing /api/local-health endpoint...${colors.reset}`);
        
        const response = await fetch(`${BASE_URL}/api/local-health`);
        
        console.log(`${colors.blue}Response status:${colors.reset} ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`${colors.green}✓ Local health endpoint is responding${colors.reset}`);
            console.log(JSON.stringify(data, null, 2));
            return true;
        } else {
            const text = await response.text();
            console.log(`${colors.red}✗ Local health endpoint returned error: ${response.status}${colors.reset}`);
            console.log(text);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ Local health endpoint test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

// Test endpoint connectivity
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
        
        console.log(`${colors.blue}Response status:${colors.reset} ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`${colors.green}✓ ${veinType} endpoint handler is defined${colors.reset}`);
            console.log(JSON.stringify(data, null, 2));
            return true;
        } else {
            const text = await response.text();
            console.log(`${colors.red}✗ ${veinType} endpoint returned error: ${response.status}${colors.reset}`);
            console.log(text);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ ${veinType} endpoint test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

// Test predict endpoint
async function testPredictEndpoint(veinType) {
    try {
        console.log(`\n${colors.cyan}Testing prediction handler for ${veinType} vein...${colors.reset}`);
        
        // Create a minimal prediction request with dummy data
        const response = await fetch(`${BASE_URL}/api/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [
                    { content: "dummyImageData" }
                ],
                metadata: {
                    veinType: veinType,
                    imageType: 'image/png',
                    testRun: true
                }
            })
        });
        
        console.log(`${colors.blue}Response status:${colors.reset} ${response.status}`);
        
        // We expect an error when testing locally without Google credentials,
        // but the important thing is to verify the endpoint is defined and responding
        // A 500 error with a specific error message is actually a success here
        
        const text = await response.text();
        if (response.status === 500 && (
            text.includes("Secret Manager") || 
            text.includes("credentials") || 
            text.includes("Vertex") ||
            text.includes("Prediction failed")
        )) {
            console.log(`${colors.green}✓ ${veinType} prediction handler is defined${colors.reset}`);
            console.log(`  Error (expected): ${text.substring(0, 100)}...`);
            return true;
        } else if (response.ok) {
            console.log(`${colors.green}✓ ${veinType} prediction handler is defined and returned success${colors.reset}`);
            const data = await response.json();
            console.log(JSON.stringify(data, null, 2));
            return true;
        } else {
            console.log(`${colors.red}✗ ${veinType} prediction handler returned unexpected error: ${response.status}${colors.reset}`);
            console.log(text);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ ${veinType} prediction test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

// Run tests
async function runLocalTests() {
    // Test the health endpoints
    const healthOk = await testHealthEndpoint();
    const localHealthOk = await testLocalHealthEndpoint();
    
    // Test each vein type
    const veinTypes = ['hepatic', 'portal', 'renal'];
    const results = {};
    
    for (const veinType of veinTypes) {
        console.log(`\n${colors.magenta}=== Testing ${veinType.toUpperCase()} Vein Endpoints ===${colors.reset}`);
        
        // Test connectivity endpoint
        const connectivityOk = await testEndpointConnectivity(veinType);
        
        // Test predict endpoint
        const predictOk = await testPredictEndpoint(veinType);
        
        results[veinType] = {
            connectivity: connectivityOk,
            predict: predictOk
        };
    }
    
    // Print summary
    console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}`);
    console.log(`${colors.blue}Health Endpoint:${colors.reset} ${healthOk ? colors.green + '✓ DEFINED' : colors.red + '✗ NOT FOUND'}${colors.reset}`);
    console.log(`${colors.blue}Local Health Endpoint:${colors.reset} ${localHealthOk ? colors.green + '✓ DEFINED' : colors.red + '✗ NOT FOUND'}${colors.reset}`);
    
    for (const [veinType, result] of Object.entries(results)) {
        console.log(`\n${colors.blue}${veinType.toUpperCase()} Vein:${colors.reset}`);
        console.log(`  Connectivity Test: ${result.connectivity ? colors.green + '✓ DEFINED' : colors.red + '✗ NOT FOUND'}${colors.reset}`);
        console.log(`  Predict Endpoint: ${result.predict ? colors.green + '✓ DEFINED' : colors.red + '✗ NOT FOUND'}${colors.reset}`);
    }
}

runLocalTests().catch(error => {
    console.error(`${colors.red}Unhandled error during tests: ${error.message}${colors.reset}`);
}); 