import express from 'express';
import { v1, helpers } from '@google-cloud/aiplatform';
import { GoogleAuth, JWT } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
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
    endpointId: "8159951878260523008",
    lastUpdated: new Date().toISOString(),
    developer: 'Gabesiegel',
    bucketName: "vexus-ai-images-plucky-weaver-450819-k7-20250223131511"
}; // Added a comment to force a redeploy

// Initialize Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(CONFIG.bucketName);

// Function to upload image to Cloud Storage
async function uploadImage(base64Image, imageType) {
    try {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${imageType}_${Date.now()}.jpg`;
        const file = bucket.file(filename);
        
        await file.save(buffer, {
            metadata: {
                contentType: 'image/jpeg'
            }
        });
        
        return `gs://${CONFIG.bucketName}/${filename}`;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
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
const PORT = process.env.PORT || 3002;

app.use(cors({
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Log requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Requesting: ${req.url}`);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route handler
app.get('*', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fallback for: ${req.url}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve index.html as fallback
});

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
        console.log('[/predict] handler invoked');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log("Fetching credentials...");
        const credentials = await getCredentials();
        console.log("Credentials fetched:", credentials); // REMOVE THIS LATER - SENSITIVE INFO!

        // Force re-initialization of predictionClient for every request (diagnostic)
        console.log("Creating new predictionClient...");
        predictionClient = new v1.PredictionServiceClient({
            apiEndpoint: process.env.VERTEX_AI_ENDPOINT,
            credentials: credentials
        });
        console.log("New predictionClient created");

        // Log the endpointId to double-check
        console.log("Endpoint ID from CONFIG:", CONFIG.endpointId);

        const { instances } = req.body;

        if (!instances || !Array.isArray(instances)) {
            return res.status(400).json({ error: 'Invalid request format. Expected "instances" array', timestamp: new Date().toISOString() });
        }

        for (const instance of instances) {
            if (!instance.content) { // Corrected check for 'content'
                return res.status(400).json({ error: 'Each instance must have content data', timestamp: new Date().toISOString() });
            }
            // Log the received base64 data for each instance
            console.log("Received base64 data for instance:", instance.content); // Corrected log
        }

        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointId}`;
        console.log("Constructed endpoint path:", endpointPath);

        const request = {
            endpoint: endpointPath,
            instances: instances.map(instance => helpers.toValue({ content: instance.content })) // Corrected 'content'
        };

        // Log the full request object before sending
        console.log("Full request object:", JSON.stringify(request, null, 2));

        console.log("Sending prediction request...");
        const [response] = await predictionClient.predict(request);

        // Log the raw response for debugging
        console.log('Raw Vertex AI response:', JSON.stringify(response, null, 2));

        // Ensure predictions array exists and has the expected structure
        const predictions = response.predictions ? response.predictions.map(prediction => {
            // Extract the values we need, with defaults if missing
            const confidences = prediction.confidences || [];
            const ids = prediction.ids || [];
            const displayNames = prediction.displayNames || [];

            // Return an object matching the expected client format
            return {
                confidences: Array.isArray(confidences) ? confidences : [],
                ids: Array.isArray(ids) ? ids : [],
                displayNames: Array.isArray(displayNames) ? displayNames : []
            };
        }) : []; // Return an empty array if response.predictions is undefined

        // Send response with full metadata
        res.json({
            predictions,
            deployedModelId: response.deployedModelId || null,
            model: response.model || null,
            modelDisplayName: response.modelDisplayName || null,
            modelVersionId: response.modelVersionId || null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Prediction error:', error);

        if (error.code === 401 || error.code === 403) {
            predictionClient = null;
        }

        res.status(500).json({ error: 'Prediction failed', message: error.message, timestamp: new Date().toISOString() });
    }
});

// ... (Health Check and Error Handling Middleware)

async function startServer() {
    try {
        console.log('startServer function invoked');
        predictionClient = await initializeVertexAI();

        const server = app.listen(PORT, '0.0.0.0');

        server.on('listening', () => {
            console.log(`[${new Date().toISOString()}] Server starting...`);
            console.log(`Server running at http://0.0.0.0:${PORT}`);
            console.log(`Project ID: ${CONFIG.projectId}`);
            console.log(`Last Updated: ${CONFIG.lastUpdated}`);
        });

        server.on('error', (error) => {
            console.error('Server error:', error);
            process.exit(1);
        });

        const shutdown = async () => {
            // ... (Shutdown logic)
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

// Start server
startServer();

// Handle uncaught errors and rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app; // Moved export statement here
