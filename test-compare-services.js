#!/usr/bin/env node

/**
 * Test script to compare on-demand service and direct Vertex AI calls
 * 
 * This script tests both the on-demand service and direct Vertex AI calls
 * with the same image and compares the results.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { v1 } from '@google-cloud/aiplatform';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Get current directory
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
    },
    onDemandEndpointService: "https://endpoints-on-demand-456295042668.us-central1.run.app"
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

// Function to prepare image for prediction
function prepareImageForPrediction(imageContent) {
    console.log(`Preparing image for prediction`);
    
    try {
        // Log the type and first few characters of the content for debugging
        console.log(`Image content type: ${typeof imageContent}`);
        if (typeof imageContent === 'string') {
            console.log(`Image content starts with: ${imageContent.substring(0, 20)}...`);
            console.log(`Image content length: ${imageContent.length} characters`);
            
            // Check if it's a valid base64 string
            const isBase64 = /^[A-Za-z0-9+/=]+$/.test(imageContent.replace(/\s/g, ''));
            console.log(`Is valid base64 (without data URL): ${isBase64}`);
        }
        
        // Clean up any whitespace in the base64 string
        const cleanBase64 = imageContent.replace(/\s/g, '');
        return cleanBase64;
    } catch (error) {
        console.error('Error preparing image for prediction:', error);
        throw new Error('Failed to prepare image for prediction: ' + error.message);
    }
}

// Test the on-demand service
async function testOnDemandService(imageBase64, veinType) {
    console.log(`\n=== Testing On-Demand Service for ${veinType} ===`);
    
    try {
        // Get credentials and token
        const credentials = await getCredentials();
        const token = credentials.access_token || credentials;
        
        // Prepare the payload
        const payload = {
            instances: [
                {
                    content: imageBase64
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            },
            metadata: {
                veinType,
                timestamp: Date.now()
            }
        };
        
        console.log(`Sending request to on-demand service: ${CONFIG.onDemandEndpointService}/predict/${veinType}`);
        
        // Make the request
        const response = await fetch(`${CONFIG.onDemandEndpointService}/predict/${veinType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`On-demand service request failed with status ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`On-demand service response:`, JSON.stringify(result, null, 2));
        
        return result;
    } catch (error) {
        console.error(`On-demand service error:`, error);
        return { error: error.message };
    }
}

// Test direct Vertex AI call
async function testDirectVertexAI(imageBase64, veinType) {
    console.log(`\n=== Testing Direct Vertex AI for ${veinType} ===`);
    
    try {
        // Initialize Vertex AI client
        const predictionClient = await initializeVertexAI();
        
        // Get the endpoint ID for the specified vein type
        const endpointId = CONFIG.endpointIds[veinType];
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        console.log(`Sending direct prediction request to endpoint: ${endpointPath}`);
        
        // Create the request object for direct Vertex AI call
        const directRequest = {
            endpoint: endpointPath,
            instances: [
                {
                    content: imageBase64
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        // Make the prediction request
        const [directResponse] = await predictionClient.predict(directRequest);
        
        console.log(`Direct Vertex AI response:`, JSON.stringify({
            deployedModelId: directResponse.deployedModelId,
            predictions: directResponse.predictions
        }, null, 2));
        
        return {
            deployedModelId: directResponse.deployedModelId,
            predictions: directResponse.predictions
        };
    } catch (error) {
        console.error(`Direct Vertex AI error:`, error);
        return { error: error.message };
    }
}

// Test direct Vertex AI call with incorrect format (for comparison)
async function testDirectVertexAIWithIncorrectFormat(imageBase64, veinType) {
    console.log(`\n=== Testing Direct Vertex AI with Incorrect Format for ${veinType} ===`);
    
    try {
        // Initialize Vertex AI client
        const predictionClient = await initializeVertexAI();
        
        // Get the endpoint ID for the specified vein type
        const endpointId = CONFIG.endpointIds[veinType];
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        console.log(`Sending direct prediction request to endpoint: ${endpointPath}`);
        
        // Create the request object with incorrect format (to demonstrate the error)
        const directRequest = {
            endpoint: endpointPath,
            instances: [
                {
                    content: {
                        b64: imageBase64
                    }
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        // Make the prediction request
        const [directResponse] = await predictionClient.predict(directRequest);
        
        console.log(`Direct Vertex AI (incorrect format) response:`, JSON.stringify({
            deployedModelId: directResponse.deployedModelId,
            predictions: directResponse.predictions
        }, null, 2));
        
        return {
            deployedModelId: directResponse.deployedModelId,
            predictions: directResponse.predictions
        };
    } catch (error) {
        console.error(`Direct Vertex AI (incorrect format) error:`, error);
        return { error: error.message };
    }
}

// Test the server's direct endpoint
async function testServerDirectEndpoint(imageBase64, veinType) {
    console.log(`\n=== Testing Server Direct Endpoint for ${veinType} ===`);
    
    try {
        // Prepare the payload
        const payload = {
            instances: [
                {
                    content: imageBase64
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            },
            metadata: {
                veinType,
                timestamp: Date.now()
            }
        };
        
        console.log(`Sending request to server direct endpoint: http://localhost:3003/api/predict/direct/${veinType}`);
        
        // Make the request
        const response = await fetch(`http://localhost:3003/api/predict/direct/${veinType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server direct endpoint request failed with status ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`Server direct endpoint response:`, JSON.stringify(result, null, 2));
        
        return result;
    } catch (error) {
        console.error(`Server direct endpoint error:`, error);
        return { error: error.message };
    }
}

// Main function
async function main() {
    try {
        console.log("=== VExUS Service Comparison Test ===");
        
        // Get the test image
        const testImagePath = path.join(__dirname, 'public', 'test_hepatic.png');
        console.log(`Reading test image: ${testImagePath}`);
        
        const imageBuffer = await fs.readFile(testImagePath);
        let imageBase64 = imageBuffer.toString('base64');
        
        // Prepare the image for prediction
        imageBase64 = prepareImageForPrediction(imageBase64);
        
        // Test with different vein types
        const veinTypes = ["hepatic", "portal", "renal"];
        
        for (const veinType of veinTypes) {
            console.log(`\n\n=== Testing ${veinType} vein ===`);
            
            // Test the on-demand service
            const onDemandResult = await testOnDemandService(imageBase64, veinType);
            
            // Test direct Vertex AI call
            const directResult = await testDirectVertexAI(imageBase64, veinType);
            
            // Test direct Vertex AI call with incorrect format
            const directB64Result = await testDirectVertexAIWithIncorrectFormat(imageBase64, veinType);
            
            // Test the server's direct endpoint
            const serverDirectResult = await testServerDirectEndpoint(imageBase64, veinType);
            
            // Compare the results
            console.log(`\n=== Comparison for ${veinType} vein ===`);
            console.log(`On-demand service success: ${!onDemandResult.error}`);
            console.log(`Direct Vertex AI success: ${!directResult.error}`);
            console.log(`Direct Vertex AI (incorrect format) success: ${!directB64Result.error}`);
            console.log(`Server direct endpoint success: ${!serverDirectResult.error}`);
        }
        
        console.log("\n=== Test completed ===");
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
