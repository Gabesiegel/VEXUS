import { v1 } from '@google-cloud/aiplatform';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Main test function
async function testVertexAIDirectly() {
    try {
        console.log('=== TESTING DIRECT VERTEX AI CONNECTION ===');
        
        // Initialize the client
        const predictionClient = await initializeVertexAI();
        
        // Read the test image
        const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        console.log(`Read image: ${imagePath}`);
        console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
        
        // Create the request object
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointId}`;
        
        // Try the b64 format recommended in Vertex AI docs for binary data
        const request = {
            endpoint: endpointPath,
            instances: [
                {
                    content: {
                        b64: base64Image
                    }
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        console.log(`Sending direct request to endpoint: ${endpointPath}`);
        console.log('Payload format:');
        console.log(JSON.stringify({
            ...request,
            instances: [{ content: { b64: base64Image.substring(0, 20) + '...' } }]
        }, null, 2));
        
        // Send the request directly to Vertex AI
        const [response] = await predictionClient.predict(request);
        
        console.log('=== SUCCESS! VERTEX AI RESPONSE ===');
        console.log(JSON.stringify({
            deployedModelId: response.deployedModelId,
            predictions: response.predictions
        }, null, 2));
        
    } catch (error) {
        console.error('=== ERROR TESTING VERTEX AI ===');
        console.error(`Error Code: ${error.code}`);
        console.error(`Error Message: ${error.message}`);
        
        if (error.details) {
            console.error(`Error Details: ${error.details}`);
        }
        
        if (error.metadata) {
            console.error('Error Metadata:', error.metadata.toJSON());
        }
    }
}

// Run the test
testVertexAIDirectly(); 