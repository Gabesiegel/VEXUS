import { v1 } from '@google-cloud/aiplatform';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Configuration
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: [
        "8159951878260523008", // Confirmed correct endpoint ID
        "5669602021812994048",  // Old ID from build/calculator.html
        "8002242328418844672"   // deployedModelId from successful predictions in nohup.out
    ]
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

// Initialize Vertex AI client
async function initializeVertexAI() {
    try {
        console.log('Getting credentials from Secret Manager...');
        const credentials = await getCredentials();

        console.log('Initializing Vertex AI client with Secret Manager credentials');
        const client = new v1.EndpointServiceClient({
            credentials: credentials
        });
        
        return client;
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
        throw error;
    }
}

// Test if an endpoint exists
async function testEndpoint(endpointId) {
    try {
        const client = await initializeVertexAI();
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        console.log(`Testing endpoint: ${endpointPath}`);
        
        const [endpoint] = await client.getEndpoint({
            name: endpointPath
        });
        
        console.log(`✅ ENDPOINT FOUND: ${endpointId}`);
        console.log(`  Display Name: ${endpoint.displayName}`);
        console.log(`  Create Time: ${endpoint.createTime?.seconds}`);
        console.log(`  Update Time: ${endpoint.updateTime?.seconds}`);
        
        if (endpoint.deployedModels && endpoint.deployedModels.length > 0) {
            console.log(`  Deployed Models: ${endpoint.deployedModels.length}`);
            endpoint.deployedModels.forEach((model, index) => {
                console.log(`  Model ${index + 1}: ${model.id}`);
                console.log(`    Display Name: ${model.displayName || 'N/A'}`);
                console.log(`    Model: ${model.model}`);
            });
        } else {
            console.log(`  No deployed models found on this endpoint`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ ENDPOINT NOT FOUND OR ERROR: ${endpointId}`);
        console.error(`  Error Code: ${error.code}`);
        console.error(`  Error Message: ${error.message}`);
        return false;
    }
}

// Main function
async function main() {
    console.log('=======================================');
    console.log('TESTING VERTEX AI ENDPOINTS');
    console.log('=======================================');
    
    let foundWorkingEndpoint = false;
    
    for (const endpointId of CONFIG.endpointIds) {
        console.log(`\nTesting endpoint ID: ${endpointId}`);
        const exists = await testEndpoint(endpointId);
        
        if (exists) {
            foundWorkingEndpoint = true;
        }
    }
    
    console.log('\n=======================================');
    if (foundWorkingEndpoint) {
        console.log('✅ Found at least one valid endpoint');
    } else {
        console.log('❌ No valid endpoints found');
        console.log('You may need to create a new endpoint or check permissions');
    }
    console.log('=======================================');
}

// Run the main function
main(); 