import express from 'express';
import { v1, helpers } from '@google-cloud/aiplatform';
import { GoogleAuth, JWT } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import {spawn} from 'child_process';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import { Firestore } from '@google-cloud/firestore';

// ES modules dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

///////////////////////////////////////////////////////////////////////////////
// 1) Configuration Setup
///////////////////////////////////////////////////////////////////////////////

const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
        hepatic: process.env.HEPATIC_ENDPOINT_ID || "8159951878260523008",  // Hepatic vein prediction endpoint
        portal: process.env.PORTAL_ENDPOINT_ID || "2970410926785691648",   // Portal vein prediction endpoint
        renal: process.env.RENAL_ENDPOINT_ID || "1148704877514326016"     // Renal vein prediction endpoint
    },
    lastUpdated: new Date().toISOString(),
    developer: 'Gabesiegel',
    bucketName: "vexus-ai-images-plucky-weaver-450819-k7-20250223131511"
}; // Each vein type uses its own specific endpoint

// Initialize Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(CONFIG.bucketName);

// Initialize Firestore
const firestore = new Firestore({
    projectId: CONFIG.projectId,
});

// Function to ensure required directories exist in the bucket
async function ensureStorageDirectories() {
    try {
        const requiredDirs = ['images', 'results'];
        
        for (const dir of requiredDirs) {
            const file = bucket.file(`${dir}/.keep`);
            
            // Check if directory exists (checking for .keep file)
            const [exists] = await file.exists();
            
            if (!exists) {
                console.log(`Creating directory: ${dir}/`);
                await file.save('', { contentType: 'text/plain' });
                console.log(`Created directory marker: ${dir}/.keep`);
            } else {
                console.log(`Directory already exists: ${dir}/`);
            }
        }
        
        console.log('Storage directories verified');
    } catch (error) {
        console.error('Error ensuring storage directories:', error);
        // Don't throw an error to allow server to continue starting
    }
}

// Function to upload image to Cloud Storage
async function uploadImage(base64Image, imageType = 'unknown') {
    try {
        let base64Data = base64Image;
        
        // Handle data URL format if provided
        if (base64Image.includes('data:')) {
            const dataURLParts = base64Image.split(',');
            if (dataURLParts.length !== 2) {
                throw new Error('Invalid data URL format');
            }
            imageType = dataURLParts[0].match(/:(.*?);/)[1];
            base64Data = dataURLParts[1];
        }

        const buffer = Buffer.from(base64Data, 'base64');
        const extension = imageType.split('/')[1] || 'jpg';
        const timestamp = Date.now();
        const filename = `image_${timestamp}.${extension}`;
        const file = bucket.file(`images/${filename}`);

        console.log(`Uploading image: ${filename}`);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Uploading image: ${filename}\n`);

        try {
            await file.save(buffer, {
                metadata: {
                    contentType: imageType
                }
            });
        } catch (uploadError) {
            console.error('Error during file.save:', uploadError);
            await fs.appendFile('server.log', `[${new Date().toISOString()}] Error during file.save: ${uploadError}\n`);
            throw uploadError;
        }
        
        const publicUrl = `https://storage.googleapis.com/${CONFIG.bucketName}/images/${filename}`;
        const gcsPath = `gs://${CONFIG.bucketName}/images/${filename}`;
        
        console.log("Image uploaded to:", gcsPath);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Image uploaded to: ${gcsPath}\n`);
        
        return {
            filename,
            gcsPath,
            publicUrl,
            timestamp
        };
    } catch (error) {
        console.error('Error uploading image:', error);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Error in uploadImage function: ${error}\n`);
        throw error;
    }
}

// Function to store prediction results in Cloud Storage
async function storePredictionResults(imageInfo, predictions, type = 'unknown') {
    try {
        const resultData = {
            imageInfo,
            predictions,
            type,
            timestamp: new Date().toISOString()
        };
        
        const filename = `results/${imageInfo.filename.replace(/\.[^/.]+$/, '')}_results.json`;
        const file = bucket.file(filename);
        
        await file.save(JSON.stringify(resultData, null, 2), {
            metadata: {
                contentType: 'application/json'
            }
        });
        
        const gcsPath = `gs://${CONFIG.bucketName}/${filename}`;
        console.log("Prediction results stored at:", gcsPath);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Prediction results stored at: ${gcsPath}\n`);
        
        return gcsPath;
    } catch (error) {
        console.error('Error storing prediction results:', error);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Error storing prediction results: ${error}\n`);
        // Don't throw error to avoid failing the main request
        return null;
    }
}

// Initialize Secret Manager client with ADC
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
        const apiEndpoint = process.env.VERTEX_AI_ENDPOINT || 
                          `${CONFIG.location}-aiplatform.googleapis.com`;
        
        console.log(`Using Vertex AI API endpoint: ${apiEndpoint}`);
        console.log(`Configured endpoints - Hepatic: ${CONFIG.endpointIds.hepatic}, Portal: ${CONFIG.endpointIds.portal}, Renal: ${CONFIG.endpointIds.renal}`);
        
        return new v1.PredictionServiceClient({
            apiEndpoint: apiEndpoint,
            credentials: credentials,
            // Add timeout to prevent hanging calls
            timeout: 120000 // 2 minutes timeout
        });
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
        console.error('Error details:', error); // Log the entire error object for more details
        throw error;
    }
}

///////////////////////////////////////////////////////////////////////////////
// 2) Express App Setup
///////////////////////////////////////////////////////////////////////////////
const app = express();
const DEFAULT_PORT = process.env.PORT || 3002;
let PORT = DEFAULT_PORT;


app.use(cors({
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json({ limit: '50mb' }));


// Log requests
app.use(async (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Requesting: ${req.url}`);
    await fs.appendFile('server.log', `Requesting: ${req.url}\n`);
    next();
});


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));



///////////////////////////////////////////////////////////////////////////////
// 3) Authentication Endpoint
///////////////////////////////////////////////////////////////////////////////
app.post('/auth/token', async (req, res) => {
  try {
    await initializeVertexAI(); // Initialize Vertex AI client to verify credentials
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed', message: error.message, timestamp: new Date().toISOString() });
  }
});



///////////////////////////////////////////////////////////////////////////////
// 4) Health Check Endpoint
///////////////////////////////////////////////////////////////////////////////
app.get('/api/health', async (req, res) => {
    console.log('Health check requested');
    
    try {
        // Basic health check
        const healthData = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            serverInfo: {
                projectId: CONFIG.projectId,
                location: CONFIG.location,
                endpointConfig: CONFIG.endpointIds,
                lastUpdated: CONFIG.lastUpdated,
                bucketName: CONFIG.bucketName
            }
        };
        
        // Check if we should do a detailed health check
        const detailed = req.query.detailed === 'true';
        
        if (detailed) {
            console.log('Performing detailed health check including Vertex AI connectivity');
            
            // Test Secret Manager access
            try {
                const credentials = await getCredentials();
                healthData.secretManager = { status: 'ok' };
            } catch (secretError) {
                console.error('Secret Manager error during health check:', secretError);
                healthData.secretManager = { 
                    status: 'error', 
                    message: secretError.message 
                };
            }
            
            // Test Cloud Storage access
            try {
                const [bucketExists] = await bucket.exists();
                healthData.storage = { 
                    status: bucketExists ? 'ok' : 'error',
                    bucketExists: bucketExists
                };
            } catch (storageError) {
                console.error('Cloud Storage error during health check:', storageError);
                healthData.storage = { 
                    status: 'error', 
                    message: storageError.message 
                };
            }
            
            // Test Vertex AI endpoints
            healthData.endpoints = {};
            
            // Get credentials for Vertex AI
            try {
                const credentials = await getCredentials();
                const auth = new GoogleAuth({
                    credentials: credentials,
                    scopes: ['https://www.googleapis.com/auth/cloud-platform']
                });
                
                const client = await auth.getClient();
                const token = await client.getAccessToken();
                
                // Test each endpoint
                for (const [veinType, endpointId] of Object.entries(CONFIG.endpointIds)) {
                    try {
                        console.log(`Testing ${veinType} endpoint (ID: ${endpointId}) during health check`);
                        
                        // Construct the endpoint URL
                        const baseApiUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1`;
                        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
                        const url = `${baseApiUrl}/${endpointPath}`;
                        
                        // Make a GET request to check if the endpoint exists
                        const response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token.token}`
                            }
                        });
                        
                        if (response.ok) {
                            const endpointData = await response.json();
                            healthData.endpoints[veinType] = {
                                status: 'ok',
                                endpointId: endpointId,
                                displayName: endpointData.displayName,
                                deployedModels: endpointData.deployedModels ? 
                                    endpointData.deployedModels.map(m => ({
                                        id: m.id,
                                        status: m.status
                                    })) : []
                            };
                        } else {
                            const errorText = await response.text();
                            healthData.endpoints[veinType] = {
                                status: 'error',
                                statusCode: response.status,
                                message: errorText
                            };
                        }
                    } catch (endpointError) {
                        console.error(`Error checking ${veinType} endpoint:`, endpointError);
                        healthData.endpoints[veinType] = {
                            status: 'error',
                            message: endpointError.message
                        };
                    }
                }
            } catch (authError) {
                console.error('Authentication error during health check:', authError);
                healthData.auth = {
                    status: 'error',
                    message: authError.message
                };
            }
        }
        
        res.json(healthData);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 5) Image Upload and Prediction Endpoint
///////////////////////////////////////////////////////////////////////////////
app.post('/api/predict', async (req, res) => {
    // Define veinType outside the try block to make it accessible in the catch block
    let veinType = 'unknown';
    
    try {
        console.log(`[${new Date().toISOString()}] /api/predict handler invoked`);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] /api/predict handler invoked\n`);

        const { instances, parameters } = req.body;
        
        console.log("Received request body:", JSON.stringify(req.body, (key, value) => {
            // Don't log the entire content string, just the first 100 chars
            if (key === 'content' && typeof value === 'string' && value.length > 100) {
                return value.substring(0, 100) + '... [truncated]';
            }
            return value;
        }, 2));
        
        if (!instances || !Array.isArray(instances)) {
            return res.status(400).json({ 
                error: 'Invalid request format. Expected "instances" array', 
                timestamp: new Date().toISOString() 
            });
        }

        // Validate and log each instance's format
        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            console.log(`Checking instance ${i}:`);
            
            if (!instance.content) {
                return res.status(400).json({ 
                    error: 'Each instance must have content data', 
                    instanceIndex: i,
                    timestamp: new Date().toISOString() 
                });
            }
            
            // Check if content is directly a string (base64)
            if (typeof instance.content === 'string') {
                console.log(`Instance ${i}: content is a base64 string (length: ${instance.content.length})`);
            } 
            // Check if content is an object with b64 field
            else if (typeof instance.content === 'object' && instance.content.b64) {
                console.log(`Instance ${i}: content has b64 field (length: ${instance.content.b64.length})`);
                // Convert to format expected by Vertex AI
                console.log(`Converting instance ${i} from {content: {b64: '...'}} to {content: '...'} format`);
                instances[i] = {
                    content: instance.content.b64
                };
            } else {
                console.log(`Instance ${i}: has unexpected content format:`, typeof instance.content);
            }
        }

        // Extract image type if metadata is provided
        const imageType = req.body.metadata?.imageType || 'image/jpeg';
        // Extract vein type if provided
        veinType = req.body.metadata?.veinType || 'hepatic';

        // Store the image in Cloud Storage
        let imageInfo = null;
        try {
            // Get the image content from the first instance
            const imageContent = instances[0].content;
            
            // Upload the image to Cloud Storage
            imageInfo = await uploadImage(imageContent, imageType);
            console.log(`Image stored successfully with ID: ${imageInfo.filename}`);
            
            // Add metadata to imageInfo
            imageInfo.veinType = veinType;
        } catch (storageError) {
            console.error('Error storing image in Cloud Storage:', storageError);
            // Continue with prediction even if storage fails
        }

        // Track the selected endpoint ID to include in error details if needed
        let endpointId = null;

        try {
            // Get credentials from Secret Manager
            console.log('Getting credentials from Secret Manager...');
            const credentials = await getCredentials();
            
            // Get an access token using the credentials
            const auth = new GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            
            console.log('Successfully obtained access token');
            
            // Use the endpoint IDs from the CONFIG object
            endpointId = CONFIG.endpointIds[veinType];
            if (!endpointId) {
                throw new Error(`Invalid vein type: ${veinType}`);
            }
            console.log(`Selected endpoint ID for ${veinType}: ${endpointId}`);
            
            // Verify endpoint ID matches known values for specific vein types
            if (veinType === 'renal' && endpointId !== CONFIG.endpointIds.renal) {
                console.warn(`WARNING: Renal vein is using incorrect endpoint ID ${endpointId}, should be ${CONFIG.endpointIds.renal}`);
            }
            if (veinType === 'portal' && endpointId !== CONFIG.endpointIds.portal) {
                console.warn(`WARNING: Portal vein is using incorrect endpoint ID ${endpointId}, should be ${CONFIG.endpointIds.portal}`);
            }
            if (veinType === 'hepatic' && endpointId !== CONFIG.endpointIds.hepatic) {
                console.warn(`WARNING: Hepatic vein is using incorrect endpoint ID ${endpointId}, should be ${CONFIG.endpointIds.hepatic}`);
            }
            
            // Construct the predict request URL
            const baseApiUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1`;
            const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
            const url = `${baseApiUrl}/${endpointPath}:predict`;
            
            console.log(`Making prediction request to: ${url}`);
            
            // Construct the payload
            const payload = {
                instances: instances,
                parameters: parameters || {
                    confidenceThreshold: 0.0,
                    maxPredictions: 5
                }
            };
            
            // Make the API call using fetch with retry mechanism
            const response = await makeApiCallWithRetry(url, payload, token, veinType);
            
            // Process the successful response
            const result = await response.json();
            console.log('Successfully received predictions');
            
            // Handle empty predictions
            if (!result.predictions || result.predictions.length === 0) {
                return res.status(404).json({ error: 'No predictions returned from the model' });
            }
            
            // Format the prediction response for the frontend
            const prediction = result.predictions[0];
            
            // Store the prediction results if we have image info
            let resultStoragePath = null;
            if (imageInfo) {
                try {
                    resultStoragePath = await storePredictionResults(
                        imageInfo,
                        {
                            displayNames: prediction.displayNames || [],
                            confidences: prediction.confidences || [],
                            modelId: result.deployedModelId || null
                        },
                        veinType
                    );
                } catch (resultStorageError) {
                    console.error('Error storing prediction results:', resultStorageError);
                    // Continue even if result storage fails
                }
            }
            
            // Return response with additional storage information
            res.json({
                displayNames: prediction.displayNames || [],
                confidences: prediction.confidences || [],
                modelId: result.deployedModelId || null,
                timestamp: new Date().toISOString(),
                storage: imageInfo ? {
                    imageUrl: imageInfo.publicUrl,
                    resultsPath: resultStoragePath,
                    stored: true
                } : {
                    stored: false,
                    reason: 'Image storage failed or was not attempted'
                }
            });
        } catch (apiError) {
            // Handle any errors during the API request process
            console.error(`API request error for ${veinType} vein:`, apiError);
            await fs.appendFile('server.log', `[${new Date().toISOString()}] API request error: ${JSON.stringify(apiError)}\n`);
            
            // Default error message and status
            let errorMessage = `Error processing ${veinType} vein prediction request`;
            let errorDetails = { originalError: apiError };
            let statusCode = 500;
            
            // Check for specific error conditions
            if (apiError.error && apiError.error.message) {
                if (apiError.error.message.includes('Failed to process request')) {
                    errorMessage = `The ${veinType} vein model is currently unavailable. This may be due to model loading issues or quota limits.`;
                    errorDetails = {
                        code: 'MODEL_UNAVAILABLE',
                        veinType: veinType,
                        endpointId: endpointId,
                        deployedModelId: apiError.error.message.match(/deployed_model_id: (\d+)/)?.[1] || 'unknown',
                        originalError: apiError.error.message
                    };
                    
                    // Log troubleshooting steps
                    console.error(`Model unavailable for ${veinType}. Troubleshooting steps:
                    1. Check if the model is still loading (can take up to 15 minutes)
                    2. Verify billing status for project ${CONFIG.projectId}
                    3. Check quota limits for Vertex AI API in Google Cloud Console
                    4. Verify service account permissions`);
                } else if (apiError.error.message.includes('quota') || 
                          apiError.error.message.includes('billing') || 
                          apiError.error.message.includes('payment')) {
                    errorMessage = `The ${veinType} vein endpoint may have billing or quota issues. Please check your Google Cloud billing status.`;
                    errorDetails = {
                        code: 'BILLING_OR_QUOTA_ISSUE',
                        veinType: veinType,
                        endpointId: endpointId,
                        originalError: apiError.error.message
                    };
                } else if (apiError.error.message.includes('Endpoint') && apiError.error.message.includes('not found')) {
                    statusCode = 404;
                    errorMessage = `The ${veinType} vein endpoint (ID: ${endpointId}) could not be found. The model may have been moved or deleted.`;
                    errorDetails = {
                        code: 'ENDPOINT_NOT_FOUND',
                        veinType: veinType,
                        endpointId: endpointId,
                        originalError: apiError.error.message
                    };
                }
            }
            
            // Return a meaningful error response
            res.status(statusCode).json({
                error: errorMessage,
                details: errorDetails,
                timestamp: new Date().toISOString(),
                storage: imageInfo ? {
                    imageUrl: imageInfo.publicUrl,
                    stored: true
                } : {
                    stored: false
                }
            });
        }
    } catch (error) {
        console.error(`Error in /api/predict for ${veinType} vein:`, error);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Error in /api/predict: ${error}\n`);
        res.status(500).json({ 
            error: 'Prediction failed', 
            message: error.message,
            veinType: veinType 
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 6) Test Endpoint for Connectivity Check
///////////////////////////////////////////////////////////////////////////////
app.post('/api/test-endpoint', async (req, res) => {
    try {
        const { metadata } = req.body;
        
        // Extract vein type from request metadata
        const veinType = metadata?.veinType || 'hepatic';
        console.log(`Testing endpoint connection for vein type: ${veinType}`);
        
        // Select the appropriate endpoint ID based on vein type
        const endpointId = CONFIG.endpointIds[veinType] || CONFIG.endpointIds.hepatic;
        
        // Get the expected endpoint ID if provided
        const expectedId = metadata?.expectedIds?.[veinType];
        
        // Log if there's a mismatch
        if (expectedId && expectedId !== endpointId) {
            console.warn(`Warning: Expected endpoint ID for ${veinType} (${expectedId}) differs from configured ID (${endpointId})`);
        }
        
        // Get credentials from Secret Manager
        const credentials = await getCredentials();
        
        // Get an access token using the credentials
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        
        // Just get the token - this verifies auth is working
        await client.getAccessToken();
        
        // Return success without actually calling the model endpoint
        // This verifies our auth works and we have a valid endpoint ID
        res.json({
            status: 'ok',
            veinType: veinType,
            endpointId: endpointId,
            expectedId: expectedId,
            match: !expectedId || expectedId === endpointId,
            message: `Successfully verified connection for ${veinType} endpoint`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Endpoint test error for ${req.body.metadata?.veinType || 'unknown'}:`, error);
        res.status(500).json({ 
            error: 'Endpoint test failed', 
            message: error.message,
            veinType: req.body.metadata?.veinType || 'unknown',
            timestamp: new Date().toISOString()
        });
    }
});

// Here's a simple version of the health endpoint that doesn't require any Google Cloud services
// This will work even when we can't connect to Google Cloud
app.get('/api/local-health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Local health check endpoint is working',
        endpointConfig: CONFIG.endpointIds
    });
});

// Default route (API fallback for React Router)
app.get('*', (req, res) => {
    console.log(`[${new Date().toISOString()}] Fallback route handler for: ${req.url}`);
    
    // Only serve index.html for browser requests (HTML), not for API calls
    const acceptHeader = req.get('accept') || '';
    if (acceptHeader.includes('text/html')) {
        console.log('Serving index.html as fallback');
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        console.log('Non-HTML request to unknown route, returning 404');
        res.status(404).json({ error: 'Not found', path: req.url });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 6) Prediction Endpoint
///////////////////////////////////////////////////////////////////////////////
let predictionClient = null;

app.post('/predict', async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] /predict handler invoked`);
        await fs.appendFile('server.log', `/predict handler invoked\n`);

        const { instances, parameters } = req.body;

        if (!instances || !Array.isArray(instances)) {
            return res.status(400).json({ error: 'Invalid request format. Expected "instances" array', timestamp: new Date().toISOString() });
        }

        for (const instance of instances) {
            if (!instance.content) {
                return res.status(400).json({ error: 'Each instance must have content data', timestamp: new Date().toISOString() });
            }
        }

        if (!predictionClient) {
            predictionClient = await initializeVertexAI();
        }

        // Extract vein type from request metadata
        const veinType = req.body.metadata?.veinType || 'hepatic';
        const endpointId = CONFIG.endpointIds[veinType] || CONFIG.endpointIds.hepatic;

        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;

        console.log(`[${new Date().toISOString()}] Sending prediction request to endpoint: ${endpointPath}`);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Sending prediction request to endpoint: ${endpointPath}\n`);

        // Create the request object in the format expected by Vertex AI
        const request = {
            endpoint: endpointPath,
            instances: instances,
            parameters: parameters || {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };

        console.log("Sending prediction request to Vertex AI:", JSON.stringify(request, null, 2));
        const [response] = await predictionClient.predict(request);

        const predictions = (response.predictions || []).map(prediction => {
            const displayNames = prediction.displayNames || [];
            const confidences = prediction.confidences || [];
            const results = displayNames.map((className, idx) => {
                const conf = confidences[idx] || 0;
                const percentage = `${(conf * 100).toFixed(0)}%`;
                return {
                    label: className,
                    confidencePerc: percentage,
                    confidenceVal: conf.toFixed(3)
                };
            });
            return results;
        });

        res.json({
          predictions,
          deployedModelId: response.deployedModelId || null,
          model: response.model || null,
          modelDisplayName: response.modelDisplayName || null,
          modelVersionId: response.modelVersionId || null,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Prediction error:', error); // Keep console logging for local debugging
        res.status(500).json({ error: 'Prediction failed', message: error.message, timestamp: new Date().toISOString() });
    }
});

// Make the API call using fetch with retry mechanism
const makeApiCallWithRetry = async (url, payload, token, veinType, maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt + 1}/${maxRetries + 1} for ${veinType} endpoint`);
            
            // Make the API call using fetch
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log(`Response status for ${veinType} endpoint: ${response.status} ${response.statusText}`);
            
            // If successful, return the response
            if (response.ok) {
                return response;
            }
            
            // If we got a 5XX error and have retries left, we'll retry
            const shouldRetry = response.status >= 500 && attempt < maxRetries;
            
            // Try to parse error response as JSON
            let errorJson;
            try {
                errorJson = await response.json();
                console.error(`API error response from ${veinType} endpoint:`, errorJson);
            } catch (parseError) {
                const errorText = await response.text();
                console.error(`API error text from ${veinType} endpoint:`, errorText);
                
                // If we can't parse as JSON and should retry, do so
                if (shouldRetry) {
                    console.log(`Retrying ${veinType} endpoint due to error: ${response.status}`);
                    // Add exponential backoff delay
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                    continue;
                }
                
                // If we can't parse as JSON and should not retry, throw a formatted error
                throw {
                    status: response.status,
                    statusText: response.statusText,
                    text: errorText
                };
            }
            
            // Check for specific error conditions
            if (errorJson.error && errorJson.error.message && 
                errorJson.error.message.includes('Failed to process request')) {
                
                console.log(`Detected model processing error for ${veinType} endpoint`);
                
                if (shouldRetry) {
                    console.log(`Retrying ${veinType} endpoint after model processing error`);
                    // Add exponential backoff delay
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                    continue;
                }
            }
            
            // If we shouldn't retry or are out of retries, throw the error
            throw errorJson;
        } catch (error) {
            // If this is the last attempt, or it's not a network error, rethrow
            if (attempt === maxRetries || !(error instanceof TypeError)) {
                throw error;
            }
            
            console.log(`Network error for ${veinType} endpoint, retrying: ${error.message}`);
            // Add exponential backoff delay
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
    }
};

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message, title, institution } = req.body;

        // Validate input
        if (!name || !email || !message || !title || !institution) {
            return res.status(400).json({
                error: 'Missing required fields',
                timestamp: new Date().toISOString()
            });
        }

        // Create a new document in the 'contacts' collection
        const contactsRef = firestore.collection('contacts');
        await contactsRef.add({
            name,
            email,
            message,
            title,
            institution,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            message: 'Contact form submitted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving contact form:', error);
        res.status(500).json({
            error: 'Failed to submit contact form',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// VExUS Image Interpretation Request endpoint
app.post('/api/interpretation-request', async (req, res) => {
    try {
        const { email, title, institution, comments } = req.body;
        const imageFile = req.files?.image;

        // Validate input
        if (!email || !title || !institution || !comments || !imageFile) {
            return res.status(400).json({
                error: 'Missing required fields',
                timestamp: new Date().toISOString()
            });
        }

        // Upload image to Cloud Storage
        const imageInfo = await uploadImage(imageFile.data.toString('base64'), imageFile.mimetype);

        // Create a new document in the 'interpretation_requests' collection
        const requestsRef = firestore.collection('interpretation_requests');
        await requestsRef.add({
            email,
            title,
            institution,
            comments,
            imageUrl: imageInfo.publicUrl,
            gcsPath: imageInfo.gcsPath,
            status: 'pending',
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            message: 'Interpretation request submitted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving interpretation request:', error);
        res.status(500).json({
            error: 'Failed to submit interpretation request',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Gallery submission endpoint
app.post('/api/gallery-submission', async (req, res) => {
    try {
        const { email, title, institution, description } = req.body;
        const imageFile = req.files?.image;

        // Validate input
        if (!email || !title || !institution || !description || !imageFile) {
            return res.status(400).json({
                error: 'Missing required fields',
                timestamp: new Date().toISOString()
            });
        }

        // Upload image to Cloud Storage
        const imageInfo = await uploadImage(imageFile.data.toString('base64'), imageFile.mimetype);

        // Create a new document in the 'gallery_submissions' collection
        const submissionsRef = firestore.collection('gallery_submissions');
        await submissionsRef.add({
            email,
            title,
            institution,
            description,
            imageUrl: imageInfo.publicUrl,
            gcsPath: imageInfo.gcsPath,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            approved: false,
            featured: false
        });

        res.status(200).json({
            message: 'Gallery submission received successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving gallery submission:', error);
        res.status(500).json({
            error: 'Failed to submit image to gallery',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test Firestore endpoint
app.post('/api/test-firestore', async (req, res) => {
    try {
        // Create a test document
        const testData = {
            test: true,
            timestamp: new Date().toISOString(),
            message: 'Test document'
        };

        // Add the test document to a test collection
        const testCollection = firestore.collection('test_collection');
        const docRef = await testCollection.add(testData);

        // Retrieve the document to verify it was stored
        const doc = await docRef.get();
        const data = doc.data();

        // Clean up by deleting the test document
        await docRef.delete();

        res.status(200).json({
            success: true,
            message: 'Firestore test successful',
            documentId: docRef.id,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Firestore test error:', error);
        res.status(500).json({
            success: false,
            error: 'Firestore test failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

async function startServer() {
    try {
        console.log('startServer function invoked');

        // Initialize Vertex AI client
        predictionClient = await initializeVertexAI();
        
        // Ensure storage directories exist
        await ensureStorageDirectories();

        // In Cloud Run, we must always use the PORT env variable
        // No fallback port logic should be used in production
        PORT = process.env.PORT || DEFAULT_PORT;
        
        const server = app.listen(PORT, '0.0.0.0');

        server.on('listening', () => {
            console.log(`[${new Date().toISOString()}] Server starting...`);
            console.log(`Server running at http://0.0.0.0:${PORT}`);
            console.log(`Project ID: ${CONFIG.projectId}`);
            console.log(`Last Updated: ${CONFIG.lastUpdated}`);
            console.log(`Cloud Storage bucket: ${CONFIG.bucketName}`);
            
            // Log port information
            console.log(`Port: ${PORT}`);
        });

        server.on('error', (error) => {
            console.error('Server error:', error);
            process.exit(1);
        });

        const shutdown = async () => {
            console.log('Shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
            
            // Force close after 5 seconds if not closed gracefully
            setTimeout(() => {
                console.log('Forcing shutdown after timeout');
                process.exit(1);
            }, 5000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}


startServer();


process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


export default app;
