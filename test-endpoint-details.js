import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

// Configuration
const PROJECT_NUMBER = "456295042668";
const LOCATION = "us-central1";

// Endpoint IDs to test
const ENDPOINTS = {
    hepatic: "8159951878260523008",  // Hepatic vein prediction endpoint
    renal: "1148704877514326016",    // Renal vein prediction endpoint
    portal: "2970410926785691648"    // Portal vein prediction endpoint
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
 * Tests a Vertex AI endpoint with detailed diagnostics
 */
async function testEndpointWithDiagnostics(veinType, endpointId) {
    console.log(`\n${colors.magenta}===========================================${colors.reset}`);
    console.log(`${colors.cyan}DETAILED DIAGNOSIS FOR ${veinType.toUpperCase()} ENDPOINT${colors.reset}`);
    console.log(`${colors.magenta}===========================================${colors.reset}`);
    console.log(`Endpoint ID: ${endpointId}`);
    console.log(`Full path: projects/${PROJECT_NUMBER}/locations/${LOCATION}/endpoints/${endpointId}`);
    
    try {
        // Step 1: Get authentication token with detailed logging
        console.log(`\n${colors.blue}Step 1: Authentication${colors.reset}`);
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        console.log(`Getting auth client...`);
        const client = await auth.getClient();
        console.log(`Auth client obtained successfully`);
        
        console.log(`Requesting access token...`);
        const token = await client.getAccessToken();
        console.log(`Access token received: ${token.token.substring(0, 10)}...`);
        
        if (!token || !token.token) {
            console.log(`${colors.red}Could not obtain authentication token${colors.reset}`);
            return false;
        }
        
        // Step 2: Check project and location permissions first
        console.log(`\n${colors.blue}Step 2: Checking project permissions${colors.reset}`);
        const projectUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_NUMBER}/locations/${LOCATION}`;
        console.log(`Making HTTP request to check project permissions: ${projectUrl}`);
        
        try {
            const projectResponse = await fetch(projectUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`Project access response status: ${projectResponse.status} ${projectResponse.statusText}`);
            
            if (!projectResponse.ok) {
                const errorText = await projectResponse.text();
                console.log(`${colors.red}Project access error: ${errorText}${colors.reset}`);
            } else {
                console.log(`${colors.green}Project access: OK${colors.reset}`);
            }
        } catch (projectError) {
            console.error(`${colors.red}Project access error:${colors.reset}`, projectError.message);
        }
        
        // Step 3: Check endpoint with detailed logging
        console.log(`\n${colors.blue}Step 3: Checking specific endpoint${colors.reset}`);
        const baseApiUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1`;
        const endpointPath = `projects/${PROJECT_NUMBER}/locations/${LOCATION}/endpoints/${endpointId}`;
        const url = `${baseApiUrl}/${endpointPath}`;
        
        console.log(`Making HTTP request to endpoint: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 20000 // 20 second timeout
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        // Detailed response analysis
        if (response.ok) {
            const data = await response.json();
            console.log(`${colors.green}✓ ${veinType} endpoint exists${colors.reset}`);
            console.log(`Display name: ${data.displayName || 'N/A'}`);
            console.log(`Created: ${data.createTime || 'N/A'}`);
            console.log(`Updated: ${data.updateTime || 'N/A'}`);
            console.log(`State: ${data.state || 'N/A'}`);
            console.log(`Deployed model count: ${data.deployedModels?.length || 0}`);
            
            if (data.deployedModels && data.deployedModels.length > 0) {
                console.log(`\nDeployed model details:`);
                data.deployedModels.forEach((model, index) => {
                    console.log(`  Model #${index + 1}:`);
                    console.log(`    ID: ${model.id || 'N/A'}`);
                    console.log(`    Model: ${model.model || 'N/A'}`);
                    console.log(`    Display name: ${model.displayName || 'N/A'}`);
                    console.log(`    Create time: ${model.createTime || 'N/A'}`);
                });
            }
            
            // Step 4: Attempt to check predict interface compatibility
            console.log(`\n${colors.blue}Step 4: Testing prediction interface${colors.reset}`);
            const predictUrl = `${baseApiUrl}/${endpointPath}:predict`;
            console.log(`Checking predict URL: ${predictUrl}`);
            
            const dummyRequest = {
                instances: [
                    { content: "dGVzdA==" } // Base64 for "test"
                ],
                parameters: {
                    confidenceThreshold: 0.0,
                    maxPredictions: 1
                }
            };
            
            console.log(`Sending minimal prediction request to test interface...`);
            try {
                const predictResponse = await fetch(predictUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dummyRequest),
                    timeout: 5000 // Short timeout - we expect this to fail with 400
                });
                
                console.log(`Predict interface response: ${predictResponse.status} ${predictResponse.statusText}`);
                
                // We expect a 400 Bad Request because our dummy data is invalid
                // But we don't expect a 404 Not Found or 403 Forbidden
                if (predictResponse.status === 400) {
                    console.log(`${colors.green}✓ Predict interface exists (400 error is expected with dummy data)${colors.reset}`);
                } else if (predictResponse.status === 404) {
                    console.log(`${colors.red}✗ Predict interface does not exist (404)${colors.reset}`);
                } else if (predictResponse.status === 403) {
                    console.log(`${colors.red}✗ Predict interface permission denied (403)${colors.reset}`);
                } else {
                    console.log(`${colors.yellow}? Unexpected predict interface response ${predictResponse.status}${colors.reset}`);
                }
                
                // Try to get response text regardless of status
                try {
                    const predictResponseText = await predictResponse.text();
                    console.log(`Response details: ${predictResponseText.substring(0, 500)}${predictResponseText.length > 500 ? '...' : ''}`);
                } catch (textError) {
                    console.log(`Could not get response text: ${textError.message}`);
                }
                
            } catch (predictError) {
                console.error(`${colors.red}Error testing predict interface:${colors.reset}`, predictError.message);
            }
            
            return true;
        } else {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = `Could not read error response: ${e.message}`;
            }
            
            console.log(`${colors.red}✗ ${veinType} endpoint error: ${response.status}${colors.reset}`);
            console.log(`Error details: ${errorText}`);
            
            // Step 4: Check if endpoint list contains this endpoint
            console.log(`\n${colors.blue}Step 4: Checking endpoints list${colors.reset}`);
            const listUrl = `${baseApiUrl}/projects/${PROJECT_NUMBER}/locations/${LOCATION}/endpoints`;
            console.log(`Checking endpoints list: ${listUrl}`);
            
            try {
                const listResponse = await fetch(listUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`List response: ${listResponse.status} ${listResponse.statusText}`);
                
                if (listResponse.ok) {
                    const listData = await listResponse.json();
                    console.log(`Found ${listData.endpoints?.length || 0} endpoints in project`);
                    
                    if (listData.endpoints && listData.endpoints.length > 0) {
                        console.log(`${colors.yellow}Available endpoints:${colors.reset}`);
                        listData.endpoints.forEach((ep, i) => {
                            const epId = ep.name.split('/').pop();
                            const isTargeted = epId === endpointId;
                            console.log(`  ${i+1}. ${ep.displayName || 'Unnamed'} (${epId})${isTargeted ? colors.red + ' ← TARGETED ENDPOINT' + colors.reset : ''}`);
                        });
                        
                        const found = listData.endpoints.some(ep => ep.name.split('/').pop() === endpointId);
                        if (!found) {
                            console.log(`${colors.red}✗ Targeted endpoint ID ${endpointId} NOT FOUND in available endpoints list${colors.reset}`);
                        }
                    } else {
                        console.log(`${colors.yellow}No endpoints found in project${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.red}Could not list endpoints: ${listResponse.status}${colors.reset}`);
                }
            } catch (listError) {
                console.error(`${colors.red}Error listing endpoints:${colors.reset}`, listError.message);
            }
            
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ Error testing ${veinType} endpoint:${colors.reset}`, error.message);
        if (error.stack) {
            console.error(`Stack trace: ${error.stack}`);
        }
        return false;
    }
}

/**
 * Main function to run all tests
 */
async function main() {
    console.log(`${colors.magenta}=== Vertex AI Endpoint Detailed Diagnostic Tool ===${colors.reset}`);
    console.log(`${colors.blue}Project Number: ${PROJECT_NUMBER}${colors.reset}`);
    console.log(`${colors.blue}Location: ${LOCATION}${colors.reset}`);
    console.log(`${colors.blue}Timestamp: ${new Date().toISOString()}${colors.reset}`);
    
    // First test the known working endpoint (hepatic)
    console.log(`\n${colors.cyan}TESTING KNOWN WORKING ENDPOINT FIRST (HEPATIC)${colors.reset}`);
    const hepaticResult = await testEndpointWithDiagnostics('hepatic', ENDPOINTS.hepatic);
    
    // Then test the problematic endpoints
    const results = {};
    results.hepatic = hepaticResult;
    
    // Test the other endpoints
    for (const [veinType, endpointId] of Object.entries(ENDPOINTS)) {
        if (veinType !== 'hepatic') { // Skip hepatic as we already tested it
            results[veinType] = await testEndpointWithDiagnostics(veinType, endpointId);
        }
    }
    
    // Print summary
    console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}`);
    for (const [veinType, result] of Object.entries(results)) {
        console.log(`${colors.blue}${veinType} Endpoint:${colors.reset} ${result ? colors.green + '✓ FOUND' : colors.red + '✗ NOT FOUND'}${colors.reset}`);
    }

    // Provide more detailed analysis based on results
    console.log(`\n${colors.magenta}=== Diagnostic Analysis ===${colors.reset}`);
    
    if (results.hepatic && (!results.renal || !results.portal)) {
        console.log(`${colors.yellow}DIAGNOSTIC: Hepatic endpoint works but others fail.${colors.reset}`);
        console.log(`${colors.yellow}This likely indicates one of the following:${colors.reset}`);
        console.log(`1. The other endpoints were deleted or moved`);
        console.log(`2. The other endpoints exist but your service account lacks permission to them`);
        console.log(`3. The other endpoints are in a different project or region`);
        
        console.log(`\n${colors.cyan}RECOMMENDED ACTIONS:${colors.reset}`);
        console.log(`1. Verify in Google Cloud Console that all endpoints exist in project ${PROJECT_NUMBER}`);
        console.log(`2. Check IAM permissions to ensure your account has access to all endpoints`);
        console.log(`3. Consider recreating the non-working endpoints or creating fallbacks`);
    } else if (!results.hepatic && !results.renal && !results.portal) {
        console.log(`${colors.red}DIAGNOSTIC: All endpoints are inaccessible.${colors.reset}`);
        console.log(`${colors.yellow}This likely indicates:${colors.reset}`);
        console.log(`1. Authentication or permission issues with the Google Cloud account`);
        console.log(`2. Network connectivity problems to Google Cloud`);
        console.log(`3. Project configuration issues`);
    }
}

// Run the script
main().catch(error => {
    console.error(`Unhandled error:`, error);
}); 