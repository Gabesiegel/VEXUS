import { GoogleAuth } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fetch from 'node-fetch';

// Configuration
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
        hepatic: "8159951878260523008",
        portal: "2970410926785691648",
        renal: "1148704877514326016"
    }
};

// Function to get credentials from Secret Manager
async function getCredentials() {
    try {
        const secretName = `projects/${CONFIG.projectId}/secrets/KEY/versions/latest`;
        console.log(`Getting credentials from Secret Manager: ${secretName}`);
        
        const client = new SecretManagerServiceClient();
        const [version] = await client.accessSecretVersion({ name: secretName });
        const payload = version.payload.data.toString('utf8');
        
        return JSON.parse(payload);
    } catch (error) {
        console.error('Error getting credentials from Secret Manager:', error);
        throw error;
    }
}

// Function to test an endpoint
async function testEndpoint(veinType) {
    try {
        console.log(`Testing ${veinType} endpoint...`);
        
        // Get credentials from Secret Manager
        const credentials = await getCredentials();
        
        // Get an access token using the credentials
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        console.log('Successfully obtained access token');
        
        // Get the endpoint ID for the vein type
        const endpointId = CONFIG.endpointIds[veinType];
        if (!endpointId) {
            throw new Error(`Invalid vein type: ${veinType}`);
        }
        
        console.log(`Selected endpoint ID for ${veinType}: ${endpointId}`);
        
        // Construct the predict request URL
        const baseApiUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1`;
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        // First, check if the endpoint exists
        const endpointUrl = `${baseApiUrl}/${endpointPath}`;
        console.log(`Checking if endpoint exists: ${endpointUrl}`);
        
        const endpointResponse = await fetch(endpointUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.token}`
            }
        });
        
        if (!endpointResponse.ok) {
            const errorText = await endpointResponse.text();
            console.error(`Error checking endpoint: ${errorText}`);
            return {
                status: 'error',
                message: `Endpoint check failed: ${endpointResponse.status} ${endpointResponse.statusText}`,
                details: errorText
            };
        }
        
        const endpointData = await endpointResponse.json();
        console.log(`Endpoint exists: ${endpointData.displayName}`);
        
        // Now try to make a prediction
        const predictUrl = `${baseApiUrl}/${endpointPath}:predict`;
        console.log(`Making prediction request to: ${predictUrl}`);
        
        // Create a minimal payload with a 1x1 transparent PNG
        const payload = {
            instances: [
                {
                    content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 1
            }
        };
        
        const predictResponse = await fetch(predictUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`Response status: ${predictResponse.status} ${predictResponse.statusText}`);
        
        if (!predictResponse.ok) {
            let errorMessage = '';
            try {
                const errorJson = await predictResponse.json();
                console.error(`API error response:`, JSON.stringify(errorJson, null, 2));
                errorMessage = errorJson.error ? errorJson.error.message : 'Unknown error';
            } catch (parseError) {
                const errorText = await predictResponse.text();
                console.error(`API error text:`, errorText);
                errorMessage = errorText;
            }
            
            return {
                status: 'error',
                statusCode: predictResponse.status,
                message: errorMessage
            };
        }
        
        const result = await predictResponse.json();
        console.log(`Prediction successful:`, JSON.stringify(result, null, 2));
        
        return {
            status: 'success',
            result: result
        };
    } catch (error) {
        console.error(`Error testing ${veinType} endpoint:`, error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

// Main function to test all endpoints
async function testAllEndpoints() {
    console.log('Testing all Vertex AI endpoints...');
    
    const results = {};
    
    for (const veinType of Object.keys(CONFIG.endpointIds)) {
        console.log(`\n=== Testing ${veinType} endpoint ===`);
        results[veinType] = await testEndpoint(veinType);
    }
    
    console.log('\n=== Test Results ===');
    for (const [veinType, result] of Object.entries(results)) {
        console.log(`${veinType}: ${result.status}`);
        if (result.status === 'error') {
            console.log(`  Error: ${result.message}`);
        }
    }
}

// Run the tests
testAllEndpoints().catch(error => {
    console.error('Error running tests:', error);
}); 