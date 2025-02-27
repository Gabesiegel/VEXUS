import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

// Configuration
const CONFIG = {
    projectId: "plucky-weaver-450819-k7", 
    projectNumber: "456295042668",
    location: "us-central1"
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

// List all Vertex AI endpoints
async function listEndpoints() {
    try {
        console.log('Getting credentials from Secret Manager...');
        const credentials = await getCredentials();
        
        console.log('Retrieved credentials successfully');
        
        // Get an access token using the credentials
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        console.log('Successfully obtained access token from Google');
        
        // List all endpoints
        const baseApiUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1`;
        const url = `${baseApiUrl}/projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints`;
        
        console.log(`Making API call to list endpoints: ${url}`);
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token.token}`
            }
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.endpoints && data.endpoints.length > 0) {
                console.log(`Found ${data.endpoints.length} endpoints:`);
                
                data.endpoints.forEach((endpoint, i) => {
                    console.log(`\nEndpoint ${i+1}:`);
                    console.log(`  Name: ${endpoint.name}`);
                    console.log(`  Display Name: ${endpoint.displayName || 'None'}`);
                    console.log(`  Create Time: ${endpoint.createTime}`);
                    console.log(`  Update Time: ${endpoint.updateTime}`);
                    
                    // Extract endpoint ID from name
                    const endpointId = endpoint.name.split('/').pop();
                    console.log(`  Endpoint ID: ${endpointId}`);
                    
                    if (endpoint.deployedModels && endpoint.deployedModels.length > 0) {
                        console.log(`  Deployed Models: ${endpoint.deployedModels.length}`);
                        endpoint.deployedModels.forEach((model, j) => {
                            console.log(`    Model ${j+1}:`);
                            console.log(`      ID: ${model.id}`);
                            console.log(`      Model: ${model.model}`);
                            console.log(`      Display Name: ${model.displayName || 'None'}`);
                        });
                    } else {
                        console.log('  No deployed models found on this endpoint');
                    }
                });
            } else {
                console.log('No endpoints found in this project and location');
            }
            
            return data.endpoints || [];
        } else {
            const text = await response.text();
            console.error('API error response:', text);
            return [];
        }
        
    } catch (error) {
        console.error('Error listing endpoints:');
        console.error(`  Error Message: ${error.message}`);
        if (error.stack) {
            console.error(`  Stack Trace: ${error.stack}`);
        }
        return [];
    }
}

// Main function
async function main() {
    console.log('=======================================');
    console.log('LISTING VERTEX AI ENDPOINTS');
    console.log('=======================================');
    
    const endpoints = await listEndpoints();
    
    console.log('\n=======================================');
    if (endpoints.length > 0) {
        console.log(`✅ Found ${endpoints.length} endpoints`);
        // Extract and list all endpoint IDs for easy reference
        console.log('\nEndpoint IDs:');
        endpoints.forEach(endpoint => {
            const endpointId = endpoint.name.split('/').pop();
            console.log(`- ${endpointId}`);
        });
    } else {
        console.log('❌ No endpoints found');
        console.log('You may need to create endpoints in this project/location');
    }
    console.log('=======================================');
}

// Run the main function
main(); 