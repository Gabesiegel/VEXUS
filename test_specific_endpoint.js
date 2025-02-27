import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
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
    endpointId: "8159951878260523008" // The endpoint we want to test
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

// Test the specific endpoint with a sample image
async function testEndpoint() {
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
        
        // Read a test image file as base64
        const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');
        console.log(`Reading test image from: ${imagePath}`);
        
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        console.log(`Image loaded, size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
        
        // Construct the predict request URL
        const baseApiUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1`;
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointId}`;
        const url = `${baseApiUrl}/${endpointPath}:predict`;
        
        console.log(`Making prediction request to: ${url}`);
        
        // Construct the payload according to Vertex AI documentation
        // Reference: https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.endpoints/predict
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
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Prediction result:', JSON.stringify(data, null, 2));
            return true;
        } else {
            const text = await response.text();
            console.error('API error response:', text);
            
            // Try with different payload format as a fallback
            console.log('\nTrying alternative payload format...');
            
            // Ensure base64Image is treated as a string
            const b64String = String(base64Image);
            console.log(`Ensuring b64 is string format (first 50 chars): "${b64String.substring(0, 50)}..."`);
            
            const alternativePayload = {
                instances: [
                    {
                        content: {
                            // Explicitly use as string to ensure correct format
                            b64: b64String
                        }
                    }
                ],
                parameters: {
                    confidenceThreshold: 0.0,
                    maxPredictions: 5
                }
            };
            
            console.log('Sending alternative payload format with b64 as string...');
            
            const alternativeResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(alternativePayload)
            });
            
            console.log(`Alternative response status: ${alternativeResponse.status} ${alternativeResponse.statusText}`);
            
            if (alternativeResponse.ok) {
                const alternativeData = await alternativeResponse.json();
                console.log('Alternative prediction result:', JSON.stringify(alternativeData, null, 2));
                return true;
            } else {
                const alternativeText = await alternativeResponse.text();
                console.error('Alternative API error response:', alternativeText);
                return false;
            }
        }
        
    } catch (error) {
        console.error('Error testing endpoint:');
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
    console.log(`TESTING ENDPOINT: ${CONFIG.endpointId}`);
    console.log('=======================================');
    
    const success = await testEndpoint();
    
    console.log('\n=======================================');
    if (success) {
        console.log('✅ Successfully tested endpoint');
    } else {
        console.log('❌ Failed to test endpoint');
        console.log('This could be due to:');
        console.log('1. Invalid payload format or structure');
        console.log('2. Missing or invalid image data');
        console.log('3. The endpoint might need specific parameters');
    }
    console.log('=======================================');
}

// Run the main function
main(); 