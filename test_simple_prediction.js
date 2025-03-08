import { v1 } from '@google-cloud/aiplatform';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { fileURLToPath } from 'url';
import path from 'path';

// ES modules dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
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

// Initialize Vertex AI client
async function initializeVertexAI() {
    try {
        console.log('Getting credentials from Secret Manager...');
        const credentials = await getCredentials();

        console.log('Initializing Vertex AI client with Secret Manager credentials');
        const apiEndpoint = `${CONFIG.location}-aiplatform.googleapis.com`;
        
        console.log(`Using Vertex AI API endpoint: ${apiEndpoint}`);
        
        // Use the PredictionServiceClient directly from v1
        return new v1.PredictionServiceClient({
            apiEndpoint: apiEndpoint,
            credentials: credentials,
            timeout: 120000 // 2 minutes timeout
        });
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
        throw error;
    }
}

// Test a simple prediction with the exact format known to work
async function testSimplePrediction() {
    try {
        console.log('Initializing Vertex AI client...');
        const predictionClient = await initializeVertexAI();
        
        // Use the hepatic endpoint for this test
        const veinType = 'hepatic';
        const endpointId = CONFIG.endpointIds[veinType];
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        // Use the exact same test image that works in test_vertex_auth.js
        // This is a 1x1 transparent PNG pixel
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        
        console.log(`Sending test prediction to ${veinType} endpoint (${endpointId})...`);
        
        // Create the request with the exact format from test_vertex_auth.js
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
        
        console.log('Request format:', JSON.stringify(request, null, 2));
        
        try {
            console.log('Calling predict API...');
            const [response] = await predictionClient.predict(request);
            
            console.log('✅ Prediction API call succeeded!');
            console.log('Deployed model ID:', response.deployedModelId || 'N/A');
            
            if (response.predictions && response.predictions.length > 0) {
                console.log('Predictions received:', response.predictions.length);
                console.log('First prediction:', JSON.stringify(response.predictions[0], null, 2));
            } else {
                console.log('No predictions returned');
            }
            
            return response;
        } catch (predictError) {
            console.error('⚠️ Prediction API call failed:', predictError);
            
            // Analyze the specific error in more detail
            console.error('Error code:', predictError.code);
            console.error('Error details:', predictError.details);
            
            if (predictError.metadata) {
                console.error('Error metadata:', predictError.metadata);
            }
            
            throw predictError;
        }
    } catch (error) {
        console.error('Error in testSimplePrediction:', error);
        throw error;
    }
}

// Run the test
testSimplePrediction()
    .then(() => {
        console.log('Test completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    }); 