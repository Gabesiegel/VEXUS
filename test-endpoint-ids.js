import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

// Configuration
const PROJECT_NUMBER = "456295042668";
const LOCATION = "us-central1";

// Endpoint IDs to test
const ENDPOINTS = {
    hepatic: "8159951878260523008",
    renal: "2369174844613853184",
    portal: "2232940955885895680"
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

/**
 * Tests a Vertex AI endpoint to see if it exists and is accessible
 */
async function testEndpoint(veinType, endpointId) {
    try {
        console.log(`\n${colors.cyan}Testing ${veinType} endpoint (ID: ${endpointId})...${colors.reset}`);
        
        // Get authentication token
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        if (!token || !token.token) {
            console.log(`${colors.red}Could not obtain authentication token${colors.reset}`);
            return false;
        }
        
        // Now check if the endpoint exists using the Vertex AI API
        const baseApiUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1`;
        const endpointPath = `projects/${PROJECT_NUMBER}/locations/${LOCATION}/endpoints/${endpointId}`;
        const url = `${baseApiUrl}/${endpointPath}`;
        
        console.log(`Making HTTP request to: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`${colors.green}✓ ${veinType} endpoint exists${colors.reset}`);
            console.log(`Display name: ${data.displayName || 'N/A'}`);
            console.log(`Created: ${data.createTime || 'N/A'}`);
            console.log(`Model ID: ${data.deployedModels?.[0]?.model || 'N/A'}`);
            return true;
        } else {
            const errorText = await response.text();
            console.log(`${colors.red}✗ ${veinType} endpoint error: ${response.status}${colors.reset}`);
            console.log(errorText);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ Error testing ${veinType} endpoint:${colors.reset}`, error.message);
        return false;
    }
}

/**
 * Main function to run all tests
 */
async function main() {
    console.log(`${colors.magenta}=== Vertex AI Endpoint Validation Tool ===${colors.reset}`);
    console.log(`${colors.blue}Project: ${PROJECT_NUMBER}${colors.reset}`);
    console.log(`${colors.blue}Location: ${LOCATION}${colors.reset}`);
    
    const results = {};
    
    for (const [veinType, endpointId] of Object.entries(ENDPOINTS)) {
        results[veinType] = await testEndpoint(veinType, endpointId);
    }
    
    // Print summary
    console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}`);
    for (const [veinType, result] of Object.entries(results)) {
        console.log(`${colors.blue}${veinType} Endpoint:${colors.reset} ${result ? colors.green + '✓ FOUND' : colors.red + '✗ NOT FOUND'}${colors.reset}`);
    }

    // Check if any endpoints exist
    const anyEndpointExists = Object.values(results).some(result => result);
    if (!anyEndpointExists) {
        console.log(`\n${colors.yellow}None of the endpoints were found. This could be due to:${colors.reset}`);
        console.log(`1. Incorrect endpoint IDs`);
        console.log(`2. Permission issues with the Google Cloud account`);
        console.log(`3. Network connectivity problems to Google Cloud`);
        console.log(`4. The endpoints have been deleted or moved`);
        
        console.log(`\n${colors.yellow}Recommendations:${colors.reset}`);
        console.log(`1. Verify the endpoint IDs in the Vertex AI console`);
        console.log(`2. Check your network connectivity to Google Cloud`);
        console.log(`3. Verify your authentication credentials`);
    }
}

// Run the script
main().catch(error => {
    console.error(`Unhandled error:`, error);
}); 