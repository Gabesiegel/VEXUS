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
import multer from 'multer';
import http from 'http';
import fetch from 'node-fetch';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import axios from 'axios';

// ES modules dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const DEBUG_LOGS_ENABLED = process.env.DEBUG_LOGS_ENABLED === 'true' || true;
const DEBUG_LOG_PATH = process.env.DEBUG_LOG_PATH || 'server_debug.log';
const VALID_VEIN_TYPES = ['hepatic', 'portal', 'renal'];

///////////////////////////////////////////////////////////////////////////////
// 1) Configuration Setup
///////////////////////////////////////////////////////////////////////////////

// Configuration with defaults that can be overridden with environment variables
const CONFIG = {
    port: process.env.PORT || 3002,
    projectId: process.env.GCP_PROJECT_ID || 'plucky-weaver-450819-k7',
    projectNumber: process.env.GCP_PROJECT_NUMBER || '456295042668',
    location: process.env.GCP_LOCATION || 'us-central1',
    
    // Bucket name for Cloud Storage
    bucketName: process.env.GCP_BUCKET_NAME || 'vexus-images',
    
    // Endpoints configured for different vein types
    endpointIds: {
        hepatic: process.env.HEPATIC_ENDPOINT_ID || '8159951878260523008',
        portal: process.env.PORTAL_ENDPOINT_ID || '2970410926785691648',
        renal: process.env.RENAL_ENDPOINT_ID || '1148704877514326016'
    },
    
    // On-demand service URL
    onDemandServiceUrl: process.env.ONDEMAND_SERVICE_URL || 'https://endpoints-on-demand-456295042668.us-central1.run.app',
    
    // Endpoint shutdown timeout in minutes
    endpointShutdownDelayMinutes: parseInt(process.env.ENDPOINT_SHUTDOWN_DELAY_MINUTES || '5', 10)
};

// Initialize Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(CONFIG.bucketName);

// Initialize Firestore
const firestore = new Firestore({
    projectId: CONFIG.projectId,
});

// Configure multer for memory storage (no temp files)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
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

// Initialize variable for PredictionServiceClient (will be set later)
let predictionClient = null;

// Get credentials from Secret Manager
async function getCredentials() {
    try {
        const secretName = `projects/${CONFIG.projectId}/secrets/KEY/versions/latest`;
        console.log('Getting credentials from Secret Manager:', secretName);
        const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
        return JSON.parse(version.payload.data.toString());
    } catch (error) {
        console.error('Failed to get credentials from Secret Manager:', error);
        
        // In Cloud Run, missing credentials should not crash the application
        // Instead, log the error and return a flag indicating auth is not available
        console.warn('⚠️ APPLICATION RUNNING WITHOUT CREDENTIALS - Some features may not work');
        
        // Return an object that indicates auth failed but won't break JSON.parse
        return { 
            _credentialError: true,
            errorMessage: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize Vertex AI client
async function initializeVertexAI() {
    try {
        console.log('Initializing Vertex AI client...');
        
        // Get credentials from Secret Manager
        const credentials = await getCredentials();
        
        // Check if credentials retrieval failed
        if (credentials._credentialError) {
            console.warn(`Cannot initialize Vertex AI: ${credentials.errorMessage}`);
            throw new Error(`Credential error: ${credentials.errorMessage}`);
        }
        
        // Initialize Google auth with credentials
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        // Create prediction client
        console.log('Creating Vertex AI Prediction client...');
        predictionClient = new PredictionServiceClient({
            auth: auth
        });
        
        console.log('Vertex AI client initialized successfully');
        return predictionClient;
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
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

// Increase JSON and URL-encoded payload limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log requests
app.use(async (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Requesting: ${req.url}`);
    await fs.appendFile('server.log', `Requesting: ${req.url}\n`);
    next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Serve static files with proper caching headers
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            // Don't cache HTML files
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

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
app.post('/predict/:veinType', async (req, res) => {
    const veinType = req.params.veinType.toLowerCase();
    console.log(`Received prediction request for ${veinType} vein`);
    
    try {
        // Verify vein type is valid
        if (!VALID_VEIN_TYPES.includes(veinType)) {
            throw new Error(`Invalid vein type: ${veinType}`);
        }
        
        // Check that we have image data
        if (!req.body || !req.body.image) {
            throw new Error('Missing image data in request body');
        }
        
        // Prepare the image and parameters
        const imageData = req.body.image;
        const parameters = req.body.parameters || {
            confidenceThreshold: 0,
            maxPredictions: 5
        };
        
        // Add diagnostic logging for request
        logDiagnostics('REQUEST', 'Prediction request received', {
            veinType, 
            hasImage: !!imageData,
            parameters
        });
        
        // Prepare image for prediction
        const preparedImage = prepareImageForPrediction(imageData);
        
        // Check if image preparation failed
        if (preparedImage.error) {
            return res.status(400).json({ 
                error: 'Invalid image format', 
                details: preparedImage.error 
            });
        }
        
        // Create instances array with the prepared image
        const instances = [{
            content: preparedImage.content,
            mimeType: preparedImage.mimeType
        }];
        
        // First try the on-demand service
        try {
            console.log(`Making prediction request for ${veinType} vein via on-demand service`);
            
            // Check if endpoint is currently being warmed up
            if (endpointStatus[veinType] && endpointStatus[veinType].warming) {
                console.log(`${veinType} endpoint is currently being warmed up. Waiting briefly...`);
                // Wait a moment for the endpoint to be ready
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // If endpoint isn't ready yet, try to warm it explicitly
            if (endpointStatus[veinType] && !endpointStatus[veinType].ready && !endpointStatus[veinType].warming) {
                console.log(`${veinType} endpoint doesn't appear to be ready. Sending prewarm request...`);
                endpointStatus[veinType].warming = true;
                
                // Send a prewarm request
                try {
                    const prewarmResponse = await fetch(`${CONFIG.onDemandServiceUrl}/predict/${veinType}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances: [{ content: 'test', mimeType: 'text/plain' }],
                            parameters: { confidenceThreshold: 0, maxPredictions: 1 },
                            metadata: { veinType, prewarm: true, timestamp: Date.now() }
                        })
                    });
                    
                    if (prewarmResponse.ok) {
                        console.log(`Successfully prewarmed ${veinType} endpoint before prediction`);
                        endpointStatus[veinType].ready = true;
                        endpointStatus[veinType].lastWarmedAt = Date.now();
                    }
                } catch (prewarmError) {
                    console.log(`Prewarm attempt before prediction failed: ${prewarmError.message}`);
                } finally {
                    endpointStatus[veinType].warming = false;
                }
            }
            
            // Prepare payload for on-demand service
            let onDemandPayload = {
                instances: req.body.instances,
                parameters,
                metadata: {
                    ...req.body.metadata,
                    veinType,
                    imageType: req.body.imageType || 'image/jpeg',
                    timestamp: Date.now(),
                    onlyOnDemand: req.body.onlyOnDemand === true
                }
            };
            
            // Check if payload is very large and optimize it if needed
            const payloadSize = JSON.stringify(onDemandPayload).length;
            if (payloadSize > 1000000) { // If payload is larger than ~1MB
                console.log(`Large payload detected (${payloadSize} bytes), optimizing...`);
                
                // Optimize instances by potentially reducing image quality or size
                onDemandPayload.instances = onDemandPayload.instances.map(instance => {
                    if (instance.content && typeof instance.content === 'string' && instance.content.length > 100000) {
                        // For base64 images, we could reduce quality or dimensions here
                        // but for now just keep the same content and log the size
                        console.log(`Large content detected (${instance.content.length} chars)`);
                        
                        // Add a flag to indicate this is a large payload and might need special handling
                        instance.isLarge = true;
                    }
                    return instance;
                });
                
                // Add a flag to the metadata to indicate this is a large payload
                onDemandPayload.metadata.isLargePayload = true;
            }
            
            // Call the on-demand service with potentially optimized payload
            const onDemandResult = await makeApiCallWithRetry(
                `${CONFIG.onDemandServiceUrl}/predict/${veinType}`,
                onDemandPayload
            );
            
            // Add diagnostic logging for on-demand response
            logDiagnostics('ONDEMAND_RESPONSE', `On-demand response for ${veinType}`, onDemandResult);
            
            // Return the prediction results
            return res.json(onDemandResult);
        } catch (onDemandError) {
            console.error('On-demand service error:', onDemandError);
            
            // Add diagnostic logging for on-demand error
            logDiagnostics('ONDEMAND_ERROR', `On-demand error for ${veinType}`, null, onDemandError);
            
            console.log('Falling back to direct Vertex AI call');
            
            try {
                const directResponse = await makeDirectVertexAIPrediction(veinType, instances, parameters);
                
                // Extract predictions from the direct response
                if (directResponse && directResponse.predictions && directResponse.predictions.length > 0) {
                    // Return the prediction results
                    return res.json({
                        displayNames: directResponse.predictions[0].displayNames || [],
                        confidences: directResponse.predictions[0].confidences || [],
                        modelId: directResponse.deployedModelId || null,
                        timestamp: Date.now()
                    });
                } else {
                    // Log the empty prediction response
                    logDiagnostics('EMPTY_PREDICTION_ERROR', `Empty prediction error for ${veinType}`, directResponse);
                    
                    // Return error for empty predictions
                    return res.status(404).json({
                        error: 'No predictions available',
                        message: 'The model did not return any predictions',
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (directError) {
                console.error('Direct Vertex AI call failed:', directError);
                
                // Add diagnostic logging for direct API error
                logDiagnostics('DIRECT_ERROR', `Direct error for ${veinType}`, null, directError);
                
                // Return error
                return res.status(500).json({
                    error: 'Prediction failed',
                    message: `Failed to process request. ${directError.message}`,
                    timestamp: new Date().toISOString(),
                    veinType
                });
            }
        }
    } catch (error) {
        console.error('Prediction error:', error);
        
        // Add error diagnostic logging
        logDiagnostics('PREDICTION_ERROR', `Prediction error for ${veinType}`, null, error);
        
        // Return the error to the client
        res.status(500).json({
            error: 'Prediction failed',
            message: error.message,
            timestamp: new Date().toISOString(),
            veinType
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 6) Endpoint Prewarming
///////////////////////////////////////////////////////////////////////////////
app.post('/api/preload-endpoint', async (req, res) => {
    try {
        const { type } = req.body;
        
        if (!type || !['hepatic', 'portal', 'renal'].includes(type)) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Invalid or missing vein type. Must be one of: hepatic, portal, renal',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if endpoint is already warming or warmed recently
        if (endpointStatus[type].warming) {
            console.log(`${type} endpoint is already being warmed`);
            return res.json({
                status: 'warming',
                message: `${type} endpoint is already being warmed`,
                timestamp: new Date().toISOString()
            });
        }
        
        // If the endpoint was warmed recently (within the last 2 minutes), return success
        if (endpointStatus[type].lastWarmedAt && 
            (Date.now() - endpointStatus[type].lastWarmedAt < 120000)) {
            console.log(`${type} endpoint was already warmed recently at ${new Date(endpointStatus[type].lastWarmedAt).toISOString()}`);
            return res.json({
                status: 'ready',
                message: `${type} endpoint is already warm`,
                lastWarmedAt: new Date(endpointStatus[type].lastWarmedAt).toISOString(),
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`Prewarming ${type} endpoint...`);
        endpointStatus[type].warming = true;
        
        // Get the endpoint ID for the specified vein type
        const endpointId = CONFIG.endpointIds[type];
        
        // We don't actually need to make a full prediction call to warm up the endpoint
        // Just verifying we can connect to it is enough to start the warm-up process
        try {
            // Get credentials from Secret Manager
            const credentials = await getCredentials();
            
            // Check if credentials retrieval failed
            if (credentials._credentialError) {
                console.warn(`Authentication error during endpoint prewarming: ${credentials.errorMessage}`);
                return res.json({
                    status: 'warming',
                    message: `Endpoint warming initiated with limited auth (${credentials.errorMessage})`,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Get an access token using the credentials
            const auth = new GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            
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
                // Update the endpoint status
                endpointStatus[type].lastWarmedAt = Date.now();
                endpointStatus[type].ready = true;
                endpointStatus[type].warming = false;
                
                return res.json({
                    status: 'warming',
                    message: `${type} endpoint warming initiated`,
                    endpointId: endpointId,
                    timestamp: new Date().toISOString()
                });
            } else {
                const errorText = await response.text();
                endpointStatus[type].warming = false;
                throw new Error(`Endpoint check failed with status ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error(`Error prewarming ${type} endpoint:`, error);
            endpointStatus[type].warming = false;
            return res.status(500).json({
                status: 'error',
                message: `Failed to prewarm ${type} endpoint: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Endpoint prewarming error:', error);
        if (type && endpointStatus[type]) {
            endpointStatus[type].warming = false;
        }
        res.status(500).json({ 
            status: 'error',
            message: `Endpoint prewarming failed: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 7) Direct Prediction Endpoint (Bypasses On-Demand Service)
///////////////////////////////////////////////////////////////////////////////
app.post('/api/predict/direct/:vein_type', upload.single('image'), async (req, res) => {
    console.log('Received direct prediction request');
    const startTime = Date.now();
    let imageInfo = null;
    
    try {
        // Get vein type from URL parameter
        const veinType = req.params.vein_type.toLowerCase();
        console.log(`Direct prediction request for ${veinType} vein`);
        
        // Check valid vein type
        if (!['hepatic', 'portal', 'renal'].includes(veinType)) {
            return res.status(400).json({ 
                error: `Invalid vein type: ${veinType}. Must be one of: hepatic, portal, renal` 
            });
        }
        
        // Get image data from request
        let imageData;
        let imageType = req.body.metadata?.imageType || req.body.imageType || 'image/jpeg';
        
        if (req.file) {
            // If image was uploaded as a file
            console.log('Processing uploaded file for prediction');
            const imageBuffer = req.file.buffer;
            imageData = imageBuffer.toString('base64');
        } else if (req.body.instances && req.body.instances[0] && req.body.instances[0].content) {
            // If image was sent in Vertex AI format
            console.log('Processing image from instances array');
            imageData = req.body.instances[0].content;
        } else if (req.body.content) {
            // If image was sent directly in content field
            console.log('Processing image from direct content field');
            imageData = req.body.content;
        } else {
            return res.status(400).json({ error: 'No image data provided' });
        }
        
        // Prepare image for prediction
        const preparedImage = prepareImageForPrediction(imageData);
        
        // Check if image preparation failed
        if (preparedImage.error) {
            return res.status(400).json({ 
                error: 'Invalid image format', 
                details: preparedImage.error 
            });
        }
        
        console.log(`Image prepared for prediction, mime type: ${preparedImage.mimeType}`);
        
        // Create the correctly formatted instances array
        const instances = [
            {
                content: preparedImage.content,
                mimeType: preparedImage.mimeType  // Include mimeType for Vertex AI
            }
        ];
        
        // Get parameters from request or use defaults
        const parameters = req.body.parameters || {
            confidenceThreshold: 0.0,
            maxPredictions: 5
        };
        
        // Initialize Vertex AI client if not already done
        if (!predictionClient) {
            predictionClient = await initializeVertexAI();
        }
        
        const endpointId = CONFIG.endpointIds[veinType];
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        console.log(`Sending direct prediction request to endpoint: ${endpointPath}`);
        
        // Create the request object for direct Vertex AI call
        const directRequest = {
            endpoint: endpointPath,
            instances: instances.map(instance => {
                // Ensure each instance has both content and mimeType fields
                return {
                    content: instance.content,
                    mimeType: instance.mimeType || 'image/jpeg'
                };
            }),
            parameters: parameters || {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        // Log the exact format being sent to Vertex AI (without the full image content)
        console.log('DEBUG - Vertex AI request format:', JSON.stringify({
            ...directRequest,
            instances: directRequest.instances.map(instance => ({
                ...instance,
                content: instance.content ? `[BASE64 DATA - ${instance.content.length} chars]` : undefined
            }))
        }, null, 2));
        
        // Add diagnostic logging for direct API request
        await logDiagnostics('DIRECT_REQUEST', `Direct request for ${veinType}`, directRequest, { veinType });
        
        try {
            const [directResponse] = await predictionClient.predict(directRequest);
            
            // Add diagnostic logging for direct API response
            await logDiagnostics('DIRECT_RESPONSE', `Direct response for ${veinType}`, directResponse, { veinType });
            
            // Check if we got valid predictions, return error if not
            if (!directResponse.predictions || 
                directResponse.predictions.length === 0 || 
                !directResponse.predictions[0].displayNames || 
                directResponse.predictions[0].displayNames.length === 0) {
                
                console.log('Direct call returned empty predictions, returning error');
                
                // Log the error
                await logDiagnostics('EMPTY_PREDICTION_ERROR', `Empty prediction error for ${veinType}`, directResponse);
                
                // Return an error response to the client
                return res.status(404).json({
                    error: 'No predictions available from AI model',
                    details: 'Direct Vertex AI call returned empty predictions',
                    veinType: veinType,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Return the prediction response
            return res.json({
                displayNames: directResponse.predictions[0].displayNames || [],
                confidences: directResponse.predictions[0].confidences || [],
                modelId: directResponse.deployedModelId || null,
                method: 'direct', // Indicate this was a direct call
                timestamp: new Date().toISOString()
            });
        } catch (directError) {
            console.error('Direct Vertex AI call failed:', directError);
            
            // Add diagnostic logging for direct API error
            await logDiagnostics('DIRECT_ERROR', `Direct error for ${veinType}`, null, { error: directError, veinType });
            
            // Schedule endpoint shutdown even after error
            scheduleEndpointShutdown(veinType);
            
            // Return error instead of using mock predictions
            console.log('Returning prediction error after direct call failed');
            
            return res.status(500).json({
                error: 'Prediction service unavailable',
                details: directError.message || 'Error during direct Vertex AI call',
                veinType: veinType,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Direct prediction error:', error);
        
        // Add error diagnostic logging
        await logDiagnostics('ERROR', 'General error', null, { error });
        
        // Return the error to the client
        return res.status(500).json({ 
            error: error.message || 'An unexpected error occurred during prediction',
            timestamp: new Date().toISOString()
        });
    } finally {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`Direct prediction request completed in ${duration}ms`);
    }
});

///////////////////////////////////////////////////////////////////////////////
// 8) Test Endpoint for Connectivity Check
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
        
        // Check if credentials retrieval failed
        if (credentials._credentialError) {
            return res.status(500).json({
                status: 'error',
                message: `Authentication error: ${credentials.errorMessage}`,
                timestamp: new Date().toISOString()
            });
        }
        
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

// Fallback route handler for SPA
app.get('*', (req, res) => {
    // Log the 404 request
    console.log(`404 request for ${req.originalUrl}`);
    res.status(404).send('Route not found');
});

///////////////////////////////////////////////////////////////////////////////
// 8) Image Prediction API
///////////////////////////////////////////////////////////////////////////////
app.post('/api/predict', async (req, res) => {
    const startTime = Date.now();
    console.log('Received /api/predict request');
    
    try {
        // Check that we have the necessary request data
        if (!req.body || !req.body.instances || !req.body.instances.length) {
            return res.status(400).json({
                error: 'Invalid request format',
                message: 'Request must include instances array',
                timestamp: new Date().toISOString()
            });
        }
        
        // Get the vein type from metadata
        const metadata = req.body.metadata || {};
        const veinType = metadata.veinType || 'hepatic';
        
        if (!VALID_VEIN_TYPES.includes(veinType)) {
            return res.status(400).json({
                error: 'Invalid vein type',
                message: `Vein type must be one of: ${VALID_VEIN_TYPES.join(', ')}`,
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if we should only use on-demand service
        const onlyUseOnDemand = metadata.onlyOnDemand === true;
        console.log(`Using on-demand service only: ${onlyUseOnDemand}`);
        
        // Get parameters from request or use defaults
        const parameters = req.body.parameters || {
            confidenceThreshold: 0.0,
            maxPredictions: 5
        };
        
        // Add diagnostic logging for request
        await logDiagnostics('API_PREDICT_REQUEST', `Prediction request for ${veinType}`, {
            veinType,
            onlyUseOnDemand,
            hasInstances: !!req.body.instances,
            instancesCount: req.body.instances ? req.body.instances.length : 0,
            parameters
        });
        
        // First try the on-demand service
        try {
            console.log(`Making prediction request for ${veinType} vein via on-demand service`);
            
            // Check if endpoint is currently being warmed up
            // Prepare payload for on-demand service
            let onDemandPayload = {
                instances: req.body.instances,
                parameters,
                metadata: {
                    ...metadata,
                    veinType,
                    imageType: req.body.imageType || 'image/jpeg',
                    timestamp: Date.now(),
                    onlyOnDemand: onlyUseOnDemand
                }
            };
            
            // Check if payload is very large and optimize it if needed
            const payloadSize = JSON.stringify(onDemandPayload).length;
            if (payloadSize > 1000000) { // If payload is larger than ~1MB
                console.log(`Large payload detected (${payloadSize} bytes), optimizing...`);
                
                // Optimize instances by potentially reducing image quality or size
                onDemandPayload.instances = onDemandPayload.instances.map(instance => {
                    if (instance.content && typeof instance.content === 'string' && instance.content.length > 100000) {
                        // For base64 images, we could reduce quality or dimensions here
                        // but for now just keep the same content and log the size
                        console.log(`Large content detected (${instance.content.length} chars)`);
                        
                        // Add a flag to indicate this is a large payload and might need special handling
                        instance.isLarge = true;
                    }
                    return instance;
                });
                
                // Add a flag to the metadata to indicate this is a large payload
                onDemandPayload.metadata.isLargePayload = true;
            }
            
            // Call the on-demand service with potentially optimized payload
            const onDemandResult = await makeApiCallWithRetry(
                `${CONFIG.onDemandServiceUrl}/predict/${veinType}`,
                onDemandPayload
            );
            
            // Log the successful response
            await logDiagnostics('API_PREDICT_SUCCESS', `On-demand prediction success for ${veinType}`, {
                veinType,
                responseTime: Date.now() - startTime,
                method: 'ondemand'
            });
            
            // Return the prediction results with method information
            return res.json({
                ...onDemandResult,
                method: 'ondemand',
                timestamp: Date.now()
            });
        } catch (onDemandError) {
            console.error('On-demand service error:', onDemandError);
            
            // Add diagnostic logging for on-demand error
            await logDiagnostics('API_PREDICT_ONDEMAND_ERROR', `On-demand error for ${veinType}`, null, onDemandError);
            
            // If we're configured to only use on-demand service, return the error
            if (onlyUseOnDemand) {
                console.log('Only using on-demand service as requested, returning error');
                return res.status(503).json({
                    error: 'Prediction service unavailable',
                    message: 'On-demand prediction service is unavailable and fallback is disabled',
                    detail: onDemandError.message,
                    timestamp: Date.now()
                });
            }
            
            // Otherwise fall back to direct Vertex AI call
            console.log('Falling back to direct Vertex AI call');
            
            try {
                const directResponse = await makeDirectVertexAIPrediction(
                    veinType, 
                    req.body.instances, 
                    parameters
                );
                
                // Log the successful response
                await logDiagnostics('API_PREDICT_SUCCESS', `Direct prediction success for ${veinType}`, {
                    veinType,
                    responseTime: Date.now() - startTime,
                    method: 'direct'
                });
                
                // Return the prediction results
                return res.json({
                    ...directResponse,
                    method: 'direct',
                    timestamp: Date.now()
                });
            } catch (directError) {
                console.error('Direct Vertex AI call failed:', directError);
                
                // Add diagnostic logging for direct API error
                await logDiagnostics('API_PREDICT_DIRECT_ERROR', `Direct error for ${veinType}`, null, directError);
                
                // Return error
                return res.status(500).json({
                    error: 'Prediction failed',
                    message: `Failed to process request. ${directError.message}`,
                    timestamp: Date.now(),
                    veinType
                });
            }
        }
    } catch (error) {
        console.error('Prediction error:', error);
        
        // Add error diagnostic logging
        await logDiagnostics('API_PREDICT_ERROR', `General prediction error`, null, error);
        
        // Return the error to the client
        return res.status(500).json({
            error: 'Prediction failed',
            message: error.message,
            timestamp: Date.now()
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 7) Main Server Initialization - MODIFIED FOR CLOUD RUN RELIABILITY
///////////////////////////////////////////////////////////////////////////////

// Start listening for requests immediately to avoid Cloud Run timeout
const server = app.listen(DEFAULT_PORT, () => {
    console.log(`Server started and listening on port ${DEFAULT_PORT} at ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

// Handle possible uncaught exceptions to prevent server crash
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Don't crash the server, just log the error
    // In a production environment, you might want to restart the process
});

// Initialize services asynchronously AFTER the server is already listening
(async function initializeServices() {
    console.log('Starting asynchronous service initialization...');
    
    // Test connection to on-demand service
    console.log(`Testing connection to on-demand service at ${CONFIG.onDemandServiceUrl}...`);
    try {
        const response = await fetch(`${CONFIG.onDemandServiceUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 200) {
            console.log('✅ On-demand service is healthy');
        } else {
            console.warn(`⚠️ On-demand service returned status ${response.status}`);
        }
    } catch (serviceError) {
        console.warn(`⚠️ Failed to connect to on-demand service: ${serviceError.message}`);
    }
    
    console.log('Initializing other services...');
    
    // Initialize Vertex AI services
    try {
        console.log('Initializing Vertex AI client...');
        await initializeVertexAI();
        console.log('✅ Vertex AI client initialized successfully');
        
        // Prewarm endpoints with systematic approach for each vein type
        await prewarmAllEndpoints();
    } catch (error) {
        console.error('❌ Error initializing services:', error);
    }
    
    console.log('✅ Asynchronous service initialization completed');
})();

// Track endpoint readiness status
const endpointStatus = {
    hepatic: { ready: false, lastWarmedAt: null, warming: false },
    portal: { ready: false, lastWarmedAt: null, warming: false },
    renal: { ready: false, lastWarmedAt: null, warming: false }
};

// Helper function to prewarm all endpoints
async function prewarmAllEndpoints() {
    console.log('Prewarming all endpoints systematically...');
    
    // Sequential prewarming with proper error handling
    for (const veinType of VALID_VEIN_TYPES) {
        try {
            // Skip if already warming or warmed recently (within last 2 minutes)
            if (endpointStatus[veinType].warming) {
                console.log(`Skipping ${veinType} endpoint prewarming - already in progress`);
                continue;
            }
            
            if (endpointStatus[veinType].lastWarmedAt && 
                (Date.now() - endpointStatus[veinType].lastWarmedAt < 120000)) {
                console.log(`Skipping ${veinType} endpoint prewarming - warmed recently at ${new Date(endpointStatus[veinType].lastWarmedAt).toISOString()}`);
                continue;
            }
            
            // Mark endpoint as warming
            endpointStatus[veinType].warming = true;
            
            console.log(`Prewarming ${veinType} endpoint with minimal test payload...`);
            
            // Create minimal test payload
            const testPayload = {
                instances: [{
                    content: 'test',  // Minimal content for prewarming
                    mimeType: 'text/plain'
                }],
                parameters: {
                    confidenceThreshold: 0,
                    maxPredictions: 1
                },
                metadata: {
                    veinType,
                    prewarm: true,
                    timestamp: Date.now()
                }
            };
            
            // Send a test request to prewarm without waiting for response
            try {
                console.log(`Sending prewarm request to on-demand service for ${veinType}...`);
                fetch(`${CONFIG.onDemandServiceUrl}/predict/${veinType}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testPayload)
                })
                .then(response => {
                    if (response.ok) {
                        console.log(`✅ ${veinType} endpoint prewarmed successfully`);
                        endpointStatus[veinType].ready = true;
                    } else {
                        console.log(`⚠️ ${veinType} endpoint prewarming returned status ${response.status}`);
                        endpointStatus[veinType].ready = false;
                    }
                    endpointStatus[veinType].lastWarmedAt = Date.now();
                    endpointStatus[veinType].warming = false;
                })
                .catch(e => {
                    console.log(`Prewarm request error for ${veinType}: ${e.message}`);
                    endpointStatus[veinType].ready = false;
                    endpointStatus[veinType].warming = false;
                });
            } catch (e) {
                console.log(`Prewarm request error for ${veinType}: ${e.message}`);
                endpointStatus[veinType].warming = false;
            }
            
            // Allow a brief pause between endpoint warmups
            await new Promise(resolve => setTimeout(resolve, 3000)); // Longer pause between endpoint warmups
        } catch (error) {
            console.warn(`⚠️ Error prewarming ${veinType} endpoint: ${error.message}`);
            endpointStatus[veinType].warming = false;
        }
    }
    
    console.log('Endpoint prewarming process completed');
}

// Function to prepare the image for prediction
function prepareImageForPrediction(base64Image, mimeType = 'image/jpeg') {
    // Handle null or undefined input
    if (!base64Image) {
        console.error('Invalid image data: null or undefined');
        return { error: 'Invalid image data' };
    }

    try {
        // Handle buffer input 
        if (Buffer.isBuffer(base64Image)) {
            return {
                content: base64Image.toString('base64'),
                mimeType: mimeType
            };
        }
    
        // Handle string input
        if (typeof base64Image === 'string') {
            // Remove data URI prefix if present
            let cleanedBase64 = base64Image;
            if (base64Image.startsWith('data:')) {
                const parts = base64Image.split(',');
                if (parts.length === 2) {
                    cleanedBase64 = parts[1];
                    // Extract mimeType if not provided
                    if (!mimeType && parts[0].includes(':') && parts[0].includes(';')) {
                        mimeType = parts[0].split(':')[1].split(';')[0];
                    }
                }
            }
            
            return {
                content: cleanedBase64,
                mimeType: mimeType
            };
        }
    
        // Handle object input
        if (typeof base64Image === 'object') {
            // If it already has the content field
            if (base64Image.content) {
                return {
                    content: base64Image.content,
                    mimeType: base64Image.mimeType || mimeType
                };
            }
            
            // If it has the base64 field
            if (base64Image.base64) {
                return {
                    content: base64Image.base64,
                    mimeType: base64Image.mimeType || mimeType
                };
            }
            
            // If it has the imageBytes field
            if (base64Image.imageBytes) {
                return {
                    content: base64Image.imageBytes,
                    mimeType: base64Image.mimeType || mimeType
                };
            }
        }
        
        // If we can't handle the input format, return an error
        console.error('Unsupported image format:', typeof base64Image);
        return { error: 'Unsupported image format' };
    } catch (error) {
        console.error('Error preparing image for prediction:', error);
        return { error: error.message };
    }
}

// Function to log diagnostics
async function logDiagnostics(type, message, data, metadata) {
    try {
        if (!DEBUG_LOGS_ENABLED) return;

        // Create a deep copy of data to sanitize if needed
        let sanitizedData = null;
        if (data) {
            try {
                sanitizedData = JSON.parse(JSON.stringify(data));
            } catch (parseError) {
                console.error('Error sanitizing data for logging:', parseError);
                sanitizedData = { error: 'Data could not be stringified', original: String(data) };
            }
        }
        
        // If data contains a content field with base64 data, abbreviate it
        if (sanitizedData && sanitizedData.instances) {
            sanitizedData.instances.forEach(instance => {
                if (instance && instance.content && typeof instance.content === 'string' && instance.content.length > 100) {
                    instance.content = `[BASE64 DATA - ${instance.content.length} chars]`;
                }
            });
        } else if (sanitizedData && sanitizedData.content && typeof sanitizedData.content === 'string' && sanitizedData.content.length > 100) {
            sanitizedData.content = `[BASE64 DATA - ${sanitizedData.content.length} chars]`;
        }
        
        // Create log entry
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            data: sanitizedData,
            metadata
        };
        
        // Write to log file using fs.promises instead of fs.appendFileSync
        try {
            await fs.appendFile(DEBUG_LOG_PATH, JSON.stringify(logEntry) + '\n', 'utf8');
        } catch (writeError) {
            console.error('Error writing to log file:', writeError);
        }
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DIAGNOSTIC] ${type} - ${message}`);
            if (sanitizedData) console.log(`[DIAGNOSTIC] Data: ${JSON.stringify(sanitizedData, null, 2)}`);
            if (metadata) console.log(`[DIAGNOSTIC] Metadata: ${JSON.stringify(metadata, null, 2)}`);
        }
    } catch (error) {
        console.error(`Error writing to debug log file: ${error}`);
    }
}

// Function to generate mock predictions
async function generateMockPredictions(veinType = 'hepatic') {
    console.log(`Generating mock predictions for ${veinType} vein`);
    
    // Define mock predictions for each vein type
    const mockPredictions = {
        hepatic: [
            { class: "Normal", confidence: 0.85 },
            { class: "Mild Congestion", confidence: 0.10 },
            { class: "Moderate Congestion", confidence: 0.03 },
            { class: "Severe Congestion", confidence: 0.02 }
        ],
        portal: [
            { class: "Normal", confidence: 0.75 },
            { class: "Mild Congestion", confidence: 0.15 },
            { class: "Moderate Congestion", confidence: 0.07 },
            { class: "Severe Congestion", confidence: 0.03 }
        ],
        renal: [
            { class: "Normal", confidence: 0.80 },
            { class: "Mild Congestion", confidence: 0.12 },
            { class: "Moderate Congestion", confidence: 0.05 },
            { class: "Severe Congestion", confidence: 0.03 }
        ]
    };
    
    // Use the appropriate mock predictions or fall back to hepatic if vein type not found
    const predictions = mockPredictions[veinType] || mockPredictions.hepatic;
    
    // Add some randomness to make it look more realistic
    const randomizedPredictions = predictions.map(pred => {
        // Add/subtract up to 10% randomly
        const randomFactor = 1 + (Math.random() * 0.2 - 0.1);
        return {
            class: pred.class,
            confidence: Math.min(0.99, Math.max(0.01, pred.confidence * randomFactor))
        };
    });
    
    // Sort by confidence
    const sortedPredictions = randomizedPredictions.sort((a, b) => b.confidence - a.confidence);
    
    // Extract display names and confidences
    const displayNames = sortedPredictions.map(p => p.class);
    const confidences = sortedPredictions.map(p => p.confidence);
    
    // Construct response
    return {
        displayNames,
        confidences,
        modelId: `mock-model-${veinType}`,
        method: 'mock',
        timestamp: new Date().toISOString()
    };
}

// Function to make direct Vertex AI prediction call
async function makeDirectVertexAIPrediction(veinType, instances, parameters) {
    try {
        console.log('Making direct Vertex AI prediction for', veinType, 'vein');
        
        // Get credentials from Secret Manager
        console.log('Getting credentials from Secret Manager...');
        const credentials = await getCredentials();
        
        // Check if credentials retrieval failed
        if (credentials._credentialError) {
            console.error(`Cannot make prediction: ${credentials.errorMessage}`);
            throw new Error(`Authentication error: ${credentials.errorMessage}`);
        }
        
        console.log('Got credentials from Secret Manager');
        
        // Initialize Google auth with credentials
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        // Get access token
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        console.log('Using Vertex AI API endpoint:', `${CONFIG.location}-aiplatform.googleapis.com`);
        console.log('Configured endpoints - Hepatic:', CONFIG.endpointIds.hepatic, 
                                      ', Portal:', CONFIG.endpointIds.portal, 
                                      ', Renal:', CONFIG.endpointIds.renal);
        
        // Ensure instances have the correct format with both content and mimeType
        const formattedInstances = instances.map(instance => {
            // If instance is already an object with content field
            if (typeof instance === 'object' && instance !== null && instance.content) {
                return {
                    content: instance.content,
                    mimeType: instance.mimeType || 'image/jpeg'
                };
            }
            
            // If instance is a string (base64 content directly)
            if (typeof instance === 'string') {
                return {
                    content: instance,
                    mimeType: 'image/jpeg'
                };
            }
            
            // Return instance if it doesn't match any known format
            return instance;
        });

        // The parameters to use for the prediction
        const predictionParams = parameters || {
            confidenceThreshold: 0,
            maxPredictions: 5
        };

        // Construct the endpoint URL directly
        const endpointUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1/projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointIds[veinType]}:predict`;
        console.log('Endpoint URL:', endpointUrl);

        // Format the API request payload
        const payload = {
            instances: formattedInstances,
            parameters: predictionParams
        };

        // Log the request format for debugging
        console.log('DEBUG - Vertex AI request payload:', JSON.stringify({
            instances: payload.instances.map(inst => ({
                content: inst.content ? `[BASE64 DATA - ${inst.content.length} chars]` : 'undefined',
                mimeType: inst.mimeType || 'undefined'
            })),
            parameters: payload.parameters
        }, null, 2));

        // Log diagnostics for the request
        await logDiagnostics('DIRECT_REQUEST', veinType, payload);
        
        // Make the API call using fetch instead of the client
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vertex AI API responded with status ${response.status}:`, errorText);
            throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
        }
        
        const predictionResult = await response.json();
        
        // Schedule endpoint shutdown
        console.log('Scheduling shutdown for', veinType, 'endpoint in', CONFIG.endpointShutdownDelayMinutes, 'minutes');
        scheduleEndpointShutdown(veinType);
        
        return predictionResult;
    } catch (error) {
        // Log the error
        await logDiagnostics('DIRECT_ERROR', veinType, null, { error });
        console.error('Direct Vertex AI call failed:', error);
        
        // Log detailed error information
        console.log('Error type:', error.constructor.name);
        if (error.code !== undefined) console.log('Error code:', error.code);
        if (error.message) console.log('Error message:', error.message);
        if (error.details) console.log('Error details:', error.details);
        if (error.metadata) console.log('Error metadata:', error.metadata);
        
        // Schedule endpoint shutdown even after error
        console.log('Scheduling shutdown for', veinType, 'endpoint in', CONFIG.endpointShutdownDelayMinutes, 'minutes');
        scheduleEndpointShutdown(veinType);
        
        throw error;
    }
}

// Function to make API calls with retry logic
async function makeApiCallWithRetry(url, payload, maxRetries = 5, initialDelay = 5000) {
    let attempt = 1;
    let delay = initialDelay;
    
    while (attempt <= maxRetries) {
        console.log(`Making API call to ${url} (attempt ${attempt}/${maxRetries})`);
        console.log(`Payload: ${JSON.stringify({
            ...payload,
            instances: payload.instances.map(instance => ({
                ...instance,
                content: instance.content ? `[BASE64 DATA - ${typeof instance.content === 'string' ? instance.content.length : 'unknown'} chars]` : undefined
            }))
        })}`);
        
        try {
            // Create AbortController for timeout functionality
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000); // 60-second timeout
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Connection': 'keep-alive'
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
                // Add keepalive option to help with connection maintenance
                keepalive: true
            });
            
            // Clear the timeout to prevent memory leaks
            clearTimeout(timeout);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed with status ${response.status}: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.log(`API call attempt ${attempt} failed: ${error.message}`);
            
            // Special handling for timeout errors
            const isTimeoutError = error.name === 'AbortError' || 
                                  error.message.includes('timeout') || 
                                  error.message.includes('timed out') ||
                                  error.message.includes('GOAWAY');
                                  
            if (isTimeoutError) {
                console.log('Detected timeout error, adjusting retry strategy...');
            }
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Calculate delay - longer for timeout errors
            const retryDelay = isTimeoutError ? delay * 1.5 : delay;
            console.log(`Waiting ${retryDelay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // Exponential backoff with a cap
            delay = Math.min(delay * 2, 30000); // Cap at 30 seconds
            attempt++;
        }
    }
}

// Function to schedule endpoint shutdown
function scheduleEndpointShutdown(veinType) {
    console.log(`Scheduling shutdown for ${veinType} endpoint in 5 minutes`);
    // In a production environment, you would implement actual shutdown logic here
    // For now, we'll just log that it would be scheduled
}
