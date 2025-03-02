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
        default: "8159951878260523008", // Default endpoint ID
        hepatic: "8159951878260523008", // Hepatic vein prediction endpoint
        renal: "2369174844613853184",   // Renal vein prediction endpoint
        portal: "2232940955885895680"   // Portal vein prediction endpoint
    },
    lastUpdated: new Date().toISOString(),
    developer: 'Gabesiegel',
    bucketName: "vexus-ai-images-plucky-weaver-450819-k7-20250223131511"
}; // Added a comment to force a redeploy

// Initialize Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(CONFIG.bucketName);

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
        return new v1.PredictionServiceClient({
            apiEndpoint: process.env.VERTEX_AI_ENDPOINT,
            credentials: credentials
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
// 4) Prediction Endpoint
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


        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointIds.default}`;

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
// 4) Health Check Endpoint
///////////////////////////////////////////////////////////////////////////////
app.get('/api/health', (req, res) => {
    console.log(`[${new Date().toISOString()}] Health check requested`);
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        serverInfo: {
            projectId: CONFIG.projectId,
            lastUpdated: CONFIG.lastUpdated
        }
    });
});

///////////////////////////////////////////////////////////////////////////////
// 5) Image Upload and Prediction Endpoint
///////////////////////////////////////////////////////////////////////////////
app.post('/api/predict', async (req, res) => {
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

        // Store the image in Cloud Storage
        let imageInfo = null;
        try {
            // Get the image content from the first instance
            const imageContent = instances[0].content;
            // Extract image type if metadata is provided
            const imageType = req.body.metadata?.imageType || 'image/jpeg';
            // Extract vein type if provided
            const veinType = req.body.metadata?.veinType || 'unknown';
            
            // Upload the image to Cloud Storage
            imageInfo = await uploadImage(imageContent, imageType);
            console.log(`Image stored successfully with ID: ${imageInfo.filename}`);
            
            // Add metadata to imageInfo
            imageInfo.veinType = veinType;
        } catch (storageError) {
            console.error('Error storing image in Cloud Storage:', storageError);
            // Continue with prediction even if storage fails
        }

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
        
        // Extract vein type from request metadata to determine endpoint
        const veinType = req.body.metadata?.veinType || 'default';
        console.log(`Vein type from request metadata: ${veinType}`);
        
        // Select the appropriate endpoint ID based on vein type
        const endpointId = CONFIG.endpointIds[veinType] || CONFIG.endpointIds.default;
        console.log(`Selected endpoint ID for ${veinType}: ${endpointId}`);
        
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
        
        console.log("Sending prediction request to Vertex AI:", JSON.stringify(payload, (key, value) => {
            // Don't log the entire content string, just the first 100 chars
            if (key === 'content' && typeof value === 'string' && value.length > 100) {
                return value.substring(0, 100) + '... [truncated]';
            }
            return value;
        }, 2));
        
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Sending prediction request to endpoint: ${endpointPath}\n`);
        
        // Make the API call using fetch instead of the client library
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}`);
        }
        
        // Process the response
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
                // Extract vein type from request metadata if available
                const veinType = req.body.metadata?.veinType || 'unknown';
                
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
    } catch (error) {
        console.error('Error in /api/predict:', error);
        await fs.appendFile('server.log', `[${new Date().toISOString()}] Error in /api/predict: ${error}\n`);
        res.status(500).json({ error: 'Prediction failed', message: error.message });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 5) Test Endpoint for Connectivity Check
///////////////////////////////////////////////////////////////////////////////
app.post('/api/test-endpoint', async (req, res) => {
    try {
        const { metadata } = req.body;
        
        // Extract vein type from request metadata
        const veinType = metadata?.veinType || 'default';
        console.log(`Testing endpoint connection for vein type: ${veinType}`);
        
        // Select the appropriate endpoint ID based on vein type
        const endpointId = CONFIG.endpointIds[veinType] || CONFIG.endpointIds.default;
        
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
