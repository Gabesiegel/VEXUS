import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';
import { v1 } from '@google-cloud/aiplatform';

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

// Main function to compare approaches
async function compareApproaches() {
    console.log('=======================================');
    console.log('COMPARING VERTEX AI APPROACHES');
    console.log('=======================================');
    
    // Read test image
    const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');
    console.log(`Reading test image from: ${imagePath}`);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    console.log(`Image loaded, size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    
    // Get credentials
    console.log('\nGetting credentials...');
    const credentials = await getCredentials();
    console.log('Retrieved credentials successfully');
    
    // Test direct Vertex AI approach
    console.log('\n--- APPROACH 1: DIRECT VERTEX AI CLIENT ---');
    await testDirectVertexAI(credentials, base64Image);
    
    // Test REST API approach
    console.log('\n--- APPROACH 2: VERTEX AI REST API ---');
    await testRestAPI(credentials, base64Image);
    
    // Test server API approach
    console.log('\n--- APPROACH 3: SERVER API ---');
    await testServerAPI(base64Image);
    
    console.log('\n=======================================');
    console.log('COMPARISON COMPLETED');
    console.log('=======================================');
}

// Test using direct Vertex AI client
async function testDirectVertexAI(credentials, base64Image) {
    try {
        console.log('Initializing Vertex AI client...');
        const predictionClient = new v1.PredictionServiceClient({
            credentials: credentials
        });
        
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointId}`;
        console.log(`Using endpoint: ${endpointPath}`);
        
        // Create request
        const request = {
            endpoint: endpointPath,
            instances: [
                {
                    content: base64Image
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        console.log('Sending prediction request via client...');
        const start = Date.now();
        
        try {
            const [response] = await predictionClient.predict(request);
            const elapsed = Date.now() - start;
            
            console.log(`✅ SUCCESS (${elapsed}ms)`);
            console.log('Predictions:');
            if (response.predictions && response.predictions.length > 0) {
                const prediction = response.predictions[0];
                if (prediction.displayNames && prediction.confidences) {
                    prediction.displayNames.forEach((name, index) => {
                        const confidence = prediction.confidences[index];
                        console.log(`- ${name}: ${(confidence * 100).toFixed(1)}%`);
                    });
                }
            }
            return true;
        } catch (error) {
            const elapsed = Date.now() - start;
            console.error(`❌ ERROR (${elapsed}ms):`, error.message);
            console.error('Error details:', error);
            return false;
        }
    } catch (error) {
        console.error('Error initializing client:', error.message);
        return false;
    }
}

// Test using REST API
async function testRestAPI(credentials, base64Image) {
    try {
        // Get access token
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        console.log('Successfully obtained access token');
        
        // Construct the predict request URL
        const baseApiUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1`;
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointId}`;
        const url = `${baseApiUrl}/${endpointPath}:predict`;
        
        console.log(`Making prediction request to: ${url}`);
        
        // Construct the payload
        const payload = {
            instances: [
                {
                    content: base64Image
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        // Make the API call
        const start = Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const elapsed = Date.now() - start;
        
        console.log(`Response status: ${response.status} ${response.statusText} (${elapsed}ms)`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS');
            console.log('Predictions:');
            if (data.predictions && data.predictions.length > 0) {
                const prediction = data.predictions[0];
                if (prediction.displayNames && prediction.confidences) {
                    prediction.displayNames.forEach((name, index) => {
                        const confidence = prediction.confidences[index];
                        console.log(`- ${name}: ${(confidence * 100).toFixed(1)}%`);
                    });
                }
            }
            return true;
        } else {
            const text = await response.text();
            console.error('❌ ERROR:', text);
            return false;
        }
    } catch (error) {
        console.error('Error in REST API approach:', error.message);
        return false;
    }
}

// Test using server API
async function testServerAPI(base64Image) {
    try {
        console.log('Testing server API endpoint...');
        
        // Construct the payload
        const payload = {
            instances: [
                {
                    content: base64Image
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        // Make the API call
        const start = Date.now();
        const response = await fetch('http://localhost:3003/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const elapsed = Date.now() - start;
        
        console.log(`Response status: ${response.status} ${response.statusText} (${elapsed}ms)`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCCESS');
            console.log('Predictions:');
            if (result.displayNames && result.confidences) {
                result.displayNames.forEach((name, index) => {
                    const confidence = result.confidences[index];
                    console.log(`- ${name}: ${(confidence * 100).toFixed(1)}%`);
                });
            } else {
                console.log('Result structure:', JSON.stringify(result, null, 2));
            }
            return true;
        } else {
            let errorText;
            try {
                const errorData = await response.json();
                errorText = JSON.stringify(errorData);
            } catch (e) {
                errorText = await response.text();
            }
            console.error('❌ ERROR:', errorText);
            return false;
        }
    } catch (error) {
        console.error('Error in server API approach:', error.message);
        return false;
    }
}

// Run the comparison
compareApproaches(); 