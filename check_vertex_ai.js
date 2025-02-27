// Utility script to check Vertex AI connectivity and test image format
import { promises as fs } from 'fs';
import path from 'path';
import { v1 } from '@google-cloud/aiplatform';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { fileURLToPath } from 'url';

// ES modules dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointId: "8159951878260523008"
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
        return new v1.PredictionServiceClient({
            credentials: credentials
        });
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
        throw error;
    }
}

// Check the model endpoints available
async function checkModelEndpoints() {
    try {
        const predictionClient = await initializeVertexAI();
        
        // Log successful authentication
        console.log('✅ Successfully authenticated with Vertex AI');
        
        // Construct the endpoint path
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointId}`;
        console.log(`Endpoint path: ${endpointPath}`);
        
        // Try to get endpoint info
        const [endpoint] = await predictionClient.getEndpoint({
            name: endpointPath
        });
        
        console.log('✅ Successfully retrieved endpoint information:');
        console.log(`- Name: ${endpoint.name}`);
        console.log(`- Display Name: ${endpoint.displayName}`);
        console.log(`- Description: ${endpoint.description}`);
        console.log(`- Deployed Models: ${endpoint.deployedModels ? endpoint.deployedModels.length : 0}`);
        
        return endpoint;
    } catch (error) {
        console.error('❌ Failed to check model endpoints:', error);
        throw error;
    }
}

// Check test image
async function checkTestImage() {
    try {
        const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');
        console.log(`Checking test image at: ${imagePath}`);
        
        // Read image file
        const imageBuffer = await fs.readFile(imagePath);
        console.log(`Image size: ${Math.round(imageBuffer.length / 1024)} KB`);
        
        // Convert to base64
        const base64Image = imageBuffer.toString('base64');
        console.log(`Base64 length: ${base64Image.length} characters`);
        
        return {
            size: imageBuffer.length,
            base64Length: base64Image.length
        };
    } catch (error) {
        console.error('❌ Failed to check test image:', error);
        throw error;
    }
}

// Main function
async function main() {
    console.log('==========================================');
    console.log('🔍 VERTEX AI CONNECTIVITY CHECK');
    console.log('==========================================');
    
    try {
        // Step 1: Check authentication and endpoint access
        await checkModelEndpoints();
        
        // Step 2: Check test image
        await checkTestImage();
        
        console.log('==========================================');
        console.log('✅ All checks passed successfully!');
    } catch (error) {
        console.log('==========================================');
        console.error('❌ Check failed:', error);
    }
}

// Run the main function
main(); 