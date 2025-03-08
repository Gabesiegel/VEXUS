// Test script to verify Vertex AI authentication and credentials
import { v1 } from '@google-cloud/aiplatform';
import { GoogleAuth } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Configuration (same as in server.js)
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
        hepatic: "8159951878260523008",  // VExUS - Hepatic Vein
        portal: "2970410926785691648",    // VExUS - Portal Vein
        renal: "1148704877514326016"      // VExUS - Renal Vein
    }
};

// Initialize Secret Manager client
const secretManagerClient = new SecretManagerServiceClient();

// Get credentials from Secret Manager
async function getCredentials() {
    try {
        const secretName = `projects/${CONFIG.projectId}/secrets/KEY/versions/latest`;
        console.log('Getting credentials from Secret Manager:', secretName);
        const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
        return JSON.parse(version.payload.data.toString());
    } catch (error) {
        console.error('Failed to get credentials from Secret Manager:', error);
        throw error;
    }
}

// Test Secret Manager connectivity
async function testSecretManager() {
    console.log('\n=== Testing Secret Manager Connectivity ===');
    try {
        const credentials = await getCredentials();
        console.log('✅ Successfully retrieved credentials from Secret Manager');
        console.log('Key type:', credentials.type);
        console.log('Project ID in credentials:', credentials.project_id);
        console.log('Client email:', credentials.client_email);
        return credentials;
    } catch (error) {
        console.error('❌ Failed to retrieve credentials:', error);
        throw error;
    }
}

// Test obtaining an access token
async function testAccessToken(credentials) {
    console.log('\n=== Testing Access Token Generation ===');
    try {
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        console.log('✅ Successfully obtained access token');
        console.log('Token type:', typeof token.token);
        console.log('Token length:', token.token.length);
        console.log('Token expiry:', token.expiryDate);
        return token;
    } catch (error) {
        console.error('❌ Failed to obtain access token:', error);
        throw error;
    }
}

// Test Vertex AI client initialization
async function testVertexAIClient(credentials) {
    console.log('\n=== Testing Vertex AI Client Initialization ===');
    try {
        const apiEndpoint = `${CONFIG.location}-aiplatform.googleapis.com`;
        
        console.log(`Using Vertex AI API endpoint: ${apiEndpoint}`);
        
        const predictionClient = new v1.PredictionServiceClient({
            apiEndpoint: apiEndpoint,
            credentials: credentials
        });
        
        // Test if the client is functional by calling a simple method
        try {
            // Check the type of client
            console.log('Prediction client type:', typeof predictionClient);
            console.log('Client methods:', Object.keys(predictionClient).filter(k => typeof predictionClient[k] === 'function').slice(0, 10));
        } catch (e) {
            console.error('Error inspecting client:', e);
        }
        
        console.log('✅ Successfully initialized Vertex AI client');
        return predictionClient;
    } catch (error) {
        console.error('❌ Failed to initialize Vertex AI client:', error);
        throw error;
    }
}

// Test endpoint status using REST API
async function testEndpointStatusREST(token) {
    console.log('\n=== Testing Endpoint Status (REST API) ===');
    
    for (const [veinType, endpointId] of Object.entries(CONFIG.endpointIds)) {
        console.log(`\nChecking ${veinType} endpoint (ID: ${endpointId})...`);
        
        try {
            const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
            console.log(`Endpoint path: ${endpointPath}`);
            
            // Construct the REST API URL
            const url = `https://${CONFIG.location}-aiplatform.googleapis.com/v1/${endpointPath}`;
            console.log(`REST API URL: ${url}`);
            
            // Make the request
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const endpoint = await response.json();
                
                console.log(`✅ ${veinType} endpoint exists`);
                console.log(`  Display name: ${endpoint.displayName}`);
                console.log(`  Create time: ${endpoint.createTime}`);
                console.log(`  Update time: ${endpoint.updateTime}`);
                
                // Check deployed models
                if (endpoint.deployedModels && endpoint.deployedModels.length > 0) {
                    console.log(`  Deployed models: ${endpoint.deployedModels.length}`);
                    
                    for (const deployedModel of endpoint.deployedModels) {
                        console.log(`    Model ID: ${deployedModel.id}`);
                        console.log(`    Model display name: ${deployedModel.displayName || 'N/A'}`);
                        console.log(`    Model version ID: ${deployedModel.modelVersionId || 'N/A'}`);
                    }
                } else {
                    console.log('  ⚠️ No deployed models found on this endpoint');
                }
            } else {
                console.error(`❌ Error checking ${veinType} endpoint: HTTP ${response.status}`);
                try {
                    const errorText = await response.text();
                    console.error(`  Error details: ${errorText}`);
                } catch (e) {
                    // Ignore error parsing error
                }
            }
        } catch (error) {
            console.error(`❌ Error checking ${veinType} endpoint:`, error);
        }
    }
}

// Test a minimal prediction to check endpoint functionality
async function testMinimalPrediction(predictionClient, veinType, token) {
    console.log(`\n=== Testing Minimal Prediction for ${veinType} ===`);
    
    try {
        const endpointId = CONFIG.endpointIds[veinType];
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        // Use a 1x1 transparent pixel as test image
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        
        console.log(`Sending test prediction to ${veinType} endpoint...`);
        
        try {
            // Try using both methods:
            
            // Method 1: Using the PredictionServiceClient
            console.log(`Method 1: Using PredictionServiceClient...`);
            const request = {
                endpoint: endpointPath,
                instances: [
                    {
                        content: testImageBase64
                    }
                ],
                parameters: {
                    confidenceThreshold: 0.0,
                    maxPredictions: 5
                }
            };
            
            try {
                const [response] = await predictionClient.predict(request);
                
                console.log('✅ Prediction API call succeeded (Method 1)');
                console.log('Deployed model ID:', response.deployedModelId || 'N/A');
                
                if (response.predictions && response.predictions.length > 0) {
                    console.log('Predictions received:', response.predictions.length);
                    
                    const firstPrediction = response.predictions[0];
                    if (firstPrediction.displayNames && firstPrediction.confidences) {
                        console.log('Display names count:', firstPrediction.displayNames.length);
                        console.log('Confidences count:', firstPrediction.confidences.length);
                        
                        if (firstPrediction.displayNames.length > 0) {
                            console.log('Sample predictions:');
                            for (let i = 0; i < Math.min(3, firstPrediction.displayNames.length); i++) {
                                console.log(`  ${firstPrediction.displayNames[i]}: ${firstPrediction.confidences[i]}`);
                            }
                        } else {
                            console.log('⚠️ Empty display names array');
                        }
                    } else {
                        console.log('⚠️ Missing displayNames or confidences in prediction');
                    }
                } else {
                    console.log('⚠️ No predictions returned');
                }
            } catch (method1Error) {
                console.error('❌ Method 1 failed:', method1Error.message);
                
                // Method 2: Using fetch directly
                console.log(`\nMethod 2: Using fetch directly...`);
                
                const url = `https://${CONFIG.location}-aiplatform.googleapis.com/v1/${endpointPath}:predict`;
                console.log(`URL: ${url}`);
                
                const fetchResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        instances: [
                            {
                                content: testImageBase64
                            }
                        ],
                        parameters: {
                            confidenceThreshold: 0.0,
                            maxPredictions: 5
                        }
                    })
                });
                
                if (fetchResponse.ok) {
                    const result = await fetchResponse.json();
                    console.log('✅ Prediction API call succeeded (Method 2)');
                    console.log('Response:', JSON.stringify(result, null, 2));
                } else {
                    console.error(`❌ Method 2 failed: HTTP ${fetchResponse.status}`);
                    try {
                        const errorText = await fetchResponse.text();
                        console.error(`Error details: ${errorText}`);
                    } catch (e) {
                        // Ignore error parsing error
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Prediction failed:', error);
            
            // Check for specific error messages
            const errorMessage = error.message || '';
            
            if (errorMessage.includes('Permission denied')) {
                console.error('⚠️ Permission issue - check service account roles');
            } else if (errorMessage.includes('not found')) {
                console.error('⚠️ Endpoint not found - check endpoint ID');
            } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                console.error('⚠️ Resource quota exceeded - check project quota limits');
            } else if (errorMessage.includes('Failed to process request')) {
                console.error('⚠️ Model processing error - model might be warming up or failing');
            }
        }
        
    } catch (error) {
        console.error(`❌ Error setting up prediction test for ${veinType}:`, error);
    }
}

// Test on-demand endpoint service
async function testOnDemandService(token) {
    console.log('\n=== Testing On-Demand Endpoint Service ===');
    
    const onDemandEndpointService = "https://endpoints-on-demand-456295042668.us-central1.run.app";
    
    for (const veinType of Object.keys(CONFIG.endpointIds)) {
        console.log(`\nTesting ${veinType} vein endpoint...`);
        
        // Step 1: Test ping
        const pingUrl = `${onDemandEndpointService}/ping/${veinType}`;
        console.log(`Pinging ${veinType} endpoint at ${pingUrl}`);
        
        try {
            const pingResponse = await fetch(pingUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.token}`
                },
                body: JSON.stringify({
                    endpointId: CONFIG.endpointIds[veinType]
                })
            });
            
            if (pingResponse.ok) {
                const pingResult = await pingResponse.json();
                console.log(`✅ Ping response:`, pingResult);
            } else {
                console.log(`⚠️ Ping returned ${pingResponse.status}`);
                try {
                    const errorText = await pingResponse.text();
                    console.log(`Error details: ${errorText}`);
                } catch (e) {
                    // Ignore
                }
            }
        } catch (pingError) {
            console.error(`❌ Error pinging ${veinType} endpoint:`, pingError);
        }
        
        // Step 2: Test predict
        const predictUrl = `${onDemandEndpointService}/predict/${veinType}`;
        console.log(`Testing prediction for ${veinType} endpoint at ${predictUrl}`);
        
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        
        try {
            const predictResponse = await fetch(predictUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.token}`
                },
                body: JSON.stringify({
                    instances: [
                        {
                            content: testImageBase64
                        }
                    ],
                    parameters: {
                        confidenceThreshold: 0.0,
                        maxPredictions: 5
                    },
                    metadata: {
                        veinType: veinType,
                        endpointId: CONFIG.endpointIds[veinType],
                        timestamp: Date.now()
                    }
                })
            });
            
            if (predictResponse.ok) {
                const predictResult = await predictResponse.json();
                console.log(`✅ Prediction response:`, JSON.stringify(predictResult, null, 2));
                
                if (predictResult.predictions && predictResult.predictions.length > 0) {
                    console.log(`✅ Received ${predictResult.predictions.length} predictions`);
                } else {
                    console.log(`⚠️ No predictions in response`);
                }
            } else {
                console.log(`⚠️ Predict returned ${predictResponse.status}`);
                try {
                    const errorText = await predictResponse.text();
                    console.log(`Error details: ${errorText}`);
                } catch (e) {
                    // Ignore
                }
            }
        } catch (predictError) {
            console.error(`❌ Error predicting with ${veinType} endpoint:`, predictError);
        }
    }
}

// Run all tests
async function runTests() {
    try {
        // Test 1: Secret Manager and credentials
        const credentials = await testSecretManager();
        
        // Test 2: Access token generation
        const token = await testAccessToken(credentials);
        
        // Test 3: Vertex AI client initialization
        const predictionClient = await testVertexAIClient(credentials);
        
        // Test 4: Endpoint status using REST API
        await testEndpointStatusREST(token);
        
        // Test 5: On-demand service
        await testOnDemandService(token);
        
        // Test 6: Minimal prediction tests
        for (const veinType of Object.keys(CONFIG.endpointIds)) {
            await testMinimalPrediction(predictionClient, veinType, token);
        }
        
        console.log('\n✅ Auth and credential verification complete');
        
    } catch (error) {
        console.error('\n❌ Tests failed:', error);
    }
}

runTests(); 