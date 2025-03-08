#!/usr/bin/env node

/**
 * Test script to verify the proper format for Vertex AI prediction
 * 
 * This script uses the format from the official Vertex AI documentation
 * for image classification prediction.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
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

// Function to predict image using the proper format from Vertex AI documentation
async function predictImage(base64Image, veinType = 'hepatic') {
    try {
        console.log(`Predicting image for ${veinType} vein using proper format from Vertex AI documentation`);
        
        // Import the required modules from @google-cloud/aiplatform
        const aiplatform = await import('@google-cloud/aiplatform');
        const {instance, params, prediction} = aiplatform.protos.google.cloud.aiplatform.v1.schema.predict;
        const {PredictionServiceClient} = aiplatform.v1;
        
        // Get credentials from Secret Manager
        const credentials = await getCredentials();
        
        // Specifies the location of the api endpoint
        const clientOptions = {
            apiEndpoint: `${CONFIG.location}-aiplatform.googleapis.com`,
            credentials: credentials
        };
        
        // Instantiates a client
        const predictionServiceClient = new PredictionServiceClient(clientOptions);
        
        // Configure the endpoint resource
        const endpointId = CONFIG.endpointIds[veinType];
        const endpoint = `projects/${CONFIG.projectId}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        console.log(`Using endpoint: ${endpoint}`);
        
        // Create parameters object
        const parametersObj = new params.ImageClassificationPredictionParams({
            confidenceThreshold: 0.0,
            maxPredictions: 5,
        });
        const parameters = parametersObj.toValue();
        
        // Create instance object with the image
        const instanceObj = new instance.ImageClassificationPredictionInstance({
            content: base64Image,
        });
        const instanceValue = instanceObj.toValue();
        
        // Create the instances array
        const instances = [instanceValue];
        
        // Create the request
        const request = {
            endpoint,
            instances,
            parameters,
        };
        
        console.log('Sending prediction request with proper format...');
        
        // Make the prediction request
        const [response] = await predictionServiceClient.predict(request);
        
        console.log('Prediction response:');
        console.log(`Deployed model id: ${response.deployedModelId}`);
        
        // Process and display predictions
        const predictions = response.predictions;
        console.log('Predictions:');
        
        for (const predictionValue of predictions) {
            const predictionResultObj = prediction.ClassificationPredictionResult.fromValue(predictionValue);
            
            for (const [i, label] of predictionResultObj.displayNames.entries()) {
                console.log(`Display name: ${label}`);
                console.log(`Confidence: ${predictionResultObj.confidences[i]}`);
                console.log(`ID: ${predictionResultObj.ids[i]}\n`);
            }
        }
        
        return response;
    } catch (error) {
        console.error('Vertex AI prediction error:', error);
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
        console.log("=== Testing Vertex AI Prediction with Proper Format ===");
        
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
