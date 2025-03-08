#!/usr/bin/env node

/**
 * Test script to verify the Google-recommended format for Vertex AI prediction
 * 
 * This script implements the exact format that Google expects for the Vertex AI
 * prediction endpoint, as provided in the example.
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

// Function to get base64 image
async function getBase64Image(filePath) {
    try {
        console.log(`Reading image from ${filePath}`);
        const fileData = await fs.readFile(filePath);
        // Convert to base64 without any data URI prefix
        return fileData.toString('base64');
    } catch (error) {
        console.error('Error reading image file:', error);
        throw error;
    }
}

// Function to predict image using Google's recommended format
async function predictImage(base64Image, veinType = 'hepatic') {
    try {
        console.log(`Predicting image for ${veinType} vein using Google's recommended format`);
        
        // Get credentials from Secret Manager
        const credentials = await getCredentials();
        
        // Initialize the PredictionServiceClient
        const predictionClient = new v1.PredictionServiceClient({
            credentials: credentials,
            apiEndpoint: `${CONFIG.location}-aiplatform.googleapis.com`,
            timeout: 120000 // 2 minutes timeout
        });
        
        // Construct the full endpoint path
        const projectNumber = CONFIG.projectNumber;
        const location = CONFIG.location;
        const endpointId = CONFIG.endpointIds[veinType];
        const endpoint = `projects/${projectNumber}/locations/${location}/endpoints/${endpointId}`;
        
        console.log(`Using endpoint: ${endpoint}`);
        
        // Clean the base64 string - remove any whitespace or newlines
        const cleanBase64 = base64Image.replace(/\s/g, '');
        
        // Build the payload exactly as expected by Google
        const request = {
            endpoint,
            instances: [
                {
                    // IMPORTANT: The image must be a plain base64-encoded string (without a data URI prefix)
                    content: cleanBase64
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
            instances: [{ content: `[BASE64 DATA - ${cleanBase64.length} chars]` }],
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
        console.error('Error type:', error.constructor.name);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        if (error.details) {
            console.error('Error details:', error.details);
        }
        throw error;
    }
}

// Main function
async function main() {
    try {
        console.log("=== Testing Vertex AI Prediction with Google's Recommended Format ===");
        
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
