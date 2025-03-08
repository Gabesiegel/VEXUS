#!/usr/bin/env node

/**
 * Test script to verify the correct format for Vertex AI prediction
 * 
 * This script tests the format suggested by the user for making direct
 * Vertex AI prediction calls.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
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

// Function to get base64 image
async function getBase64Image(filePath) {
    try {
        console.log(`Reading image from ${filePath}`);
        const fileData = await fs.readFile(filePath);
        return fileData.toString('base64');
    } catch (error) {
        console.error('Error reading image file:', error);
        throw error;
    }
}

// Function to predict image
async function predictImage(base64Image, veinType = 'hepatic') {
    try {
        console.log(`Predicting image for ${veinType} vein`);
        
        // Initialize Vertex AI client
        const predictionClient = await initializeVertexAI();
        
        // Construct the full endpoint path
        const projectNumber = CONFIG.projectNumber;
        const location = CONFIG.location;
        const endpointId = CONFIG.endpointIds[veinType];
        const endpoint = `projects/${projectNumber}/locations/${location}/endpoints/${endpointId}`;
        
        console.log(`Using endpoint: ${endpoint}`);
        
        // Build the payload exactly as expected
        const request = {
            endpoint,
            instances: [
                {
                    // IMPORTANT: The image must be a plain base64-encoded string (without a data URI prefix)
                    content: base64Image
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        console.log('Sending direct prediction request with payload structure:');
        console.log(JSON.stringify({
            endpoint: request.endpoint,
            instances: [{ content: `[BASE64 DATA - ${base64Image.length} chars]` }],
            parameters: request.parameters
        }, null, 2));
        
        // Make the prediction request
        console.log('Making prediction request...');
        const [response] = await predictionClient.predict(request);
        
        console.log('Prediction response:');
        console.log(JSON.stringify({
            deployedModelId: response.deployedModelId,
            predictions: response.predictions
        }, null, 2));
        
        return response;
    } catch (error) {
        console.error('Direct Vertex AI prediction error:', error);
        throw error;
    }
}

// Main function
async function main() {
    try {
        console.log("=== Testing Vertex AI Prediction Format ===");
        
        // Get the test image
        const testImagePath = path.join(__dirname, 'public', 'test_hepatic.png');
        const base64Image = await getBase64Image(testImagePath);
        
        console.log(`Image loaded, base64 length: ${base64Image.length}`);
        
        // Test with hepatic vein
        await predictImage(base64Image, 'hepatic');
        
        console.log("\n=== Test completed ===");
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
