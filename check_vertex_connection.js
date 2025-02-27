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

// Test basic Vertex AI API connectivity
async function testVertexConnection() {
    try {
        console.log('Getting credentials from Secret Manager...');
        const credentials = await getCredentials();
        
        console.log('Retrieved credentials successfully');
        console.log(`Client Email: ${credentials.client_email}`);
        console.log(`Project ID: ${credentials.project_id}`);
        
        // Get an access token using the credentials
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        console.log('Successfully obtained access token from Google');
        
        // Test a simple, direct API call
        const baseApiUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1`;
        const url = `${baseApiUrl}/projects/${CONFIG.projectNumber}/locations/${CONFIG.location}`;
        
        console.log(`Making API call to: ${url}`);
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token.token}`
            }
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API response:', JSON.stringify(data, null, 2));
            return true;
        } else {
            const text = await response.text();
            console.error('API error response:', text);
            return false;
        }
        
    } catch (error) {
        console.error('Error testing Vertex AI connection:');
        console.error(`  Error Code: ${error.code || 'N/A'}`);
        console.error(`  Error Message: ${error.message}`);
        if (error.stack) {
            console.error(`  Stack Trace: ${error.stack}`);
        }
        return false;
    }
}

// Main function
async function main() {
    console.log('=======================================');
    console.log('TESTING VERTEX AI BASIC CONNECTIVITY');
    console.log('=======================================');
    
    const success = await testVertexConnection();
    
    console.log('\n=======================================');
    if (success) {
        console.log('✅ Successfully connected to Vertex AI API');
    } else {
        console.log('❌ Failed to connect to Vertex AI API');
        console.log('This could be due to:');
        console.log('1. Invalid or expired credentials');
        console.log('2. Network issues or firewall restrictions');
        console.log('3. The project or API is not properly enabled');
    }
    console.log('=======================================');
}

// Run the main function
main(); 