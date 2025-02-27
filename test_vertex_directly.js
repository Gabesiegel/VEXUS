import { v1 } from '@google-cloud/aiplatform';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

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

// Test Vertex AI Model Service
async function testModelService() {
    try {
        console.log('Getting credentials from Secret Manager...');
        const credentials = await getCredentials();

        console.log('Initializing Vertex AI client with Secret Manager credentials');
        const modelServiceClient = new v1.ModelServiceClient({
            credentials: credentials
        });

        // List models in the project
        const parent = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}`;
        console.log(`Listing models in: ${parent}`);
        
        const [models] = await modelServiceClient.listModels({
            parent
        });

        console.log(`Found ${models.length} models:`);
        models.forEach((model, i) => {
            console.log(`Model ${i+1}: ${model.displayName || 'No display name'}`);
            console.log(`  ID: ${model.name}`);
            console.log(`  Created: ${model.createTime?.toISOString()}`);
            console.log(`  Updated: ${model.updateTime?.toISOString()}`);
            console.log(`  Version: ${model.versionId || 'None'}`);
            console.log('-------------------');
        });
        
        return models;
    } catch (error) {
        console.error('❌ ERROR testing Vertex AI Model Service:');
        console.error(`  Error Code: ${error.code}`);
        console.error(`  Error Message: ${error.message}`);
        if (error.details) {
            console.error(`  Error Details: ${error.details}`);
        }
        return null;
    }
}

// Main function
async function main() {
    console.log('=======================================');
    console.log('TESTING VERTEX AI MODEL SERVICE');
    console.log('=======================================');
    
    const models = await testModelService();
    
    console.log('\n=======================================');
    if (models && models.length > 0) {
        console.log('✅ Successfully connected to Vertex AI Model Service');
        console.log(`Found ${models.length} models`);
    } else {
        console.log('❌ Could not list any models');
        console.log('This could be due to permissions, network issues, or no models exist');
    }
    console.log('=======================================');
}

// Run the main function
main(); 