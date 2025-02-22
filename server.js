import express from 'express';
import { v1 } from '@google-cloud/aiplatform';
import { GoogleAuth, JWT } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
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
    endpointId: "7513685331732856832",
    lastUpdated: new Date().toISOString(),
    developer: 'Gabesiegel'
}; // Added a comment to force a redeploy

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
            apiEndpoint: 'us-central1-aiplatform.googleapis.com',
            credentials: credentials
        });
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
        console.error('Error details:', { message: error.message, code: error.code, stack: error.stack });
        throw error;
    }
}

///////////////////////////////////////////////////////////////////////////////
// 2) Express App Setup
///////////////////////////////////////////////////////////////////////////////

const app = express();
// Get port from environment variable, defaulting to 3002 if not set
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

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route handler
app.get('*', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fallback for: ${req.url}`);
    
    res.sendFile(path.join(__dirname, 'public', 'calculator.html'));
});

///////////////////////////////////////////////////////////////////////////////
// 3) Authentication Endpoint
///////////////////////////////////////////////////////////////////////////////

app.post('/auth/token', async (req, res) => {
    try {
        // Initialize Vertex AI client to verify credentials
        await initializeVertexAI();
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 4) Prediction Endpoint
///////////////////////////////////////////////////////////////////////////////

let predictionClient = null;

app.post('/predict', async (req, res) => {
    try {
        console.log('[/predict] handler invoked'); // New logging statement
        // Get fresh credentials
        const credentials = await getCredentials();

        const { instances } = req.body;
        
        if (!instances || !Array.isArray(instances)) {
            return res.status(400).json({
                error: 'Invalid request format. Expected "instances" array',
                timestamp: new Date().toISOString()
            });
        }

        // Validate each instance
        for (const instance of instances) {
            if (!instance.b64) {
                return res.status(400).json({
                    error: 'Each instance must have b64 data',
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Create prediction client
        const predictionClient = new v1.PredictionServiceClient({
            apiEndpoint: 'us-central1-aiplatform.googleapis.com',
            credentials: credentials
        });

        // Make prediction request
        const request = {
            name: `projects/plucky-weaver-450819-k7/locations/us-central1/endpoints/7513685331732856832`,
            instances: instances.map(instance => ({
                b64: instance.b64
            }))
        };

        console.log('Making prediction request:', request);
        console.log('Making prediction request:', request);
        console.log('Constructed resource name:', request.name);
	console.log('Full request payload:', JSON.stringify(request, null, 2));
        const [response] = await predictionClient.predict(request);

        console.log('Prediction response:', response);

        if (!response || !response.predictions) {
            throw new Error('Invalid response from Vertex AI');
        }

        const predictions = response.predictions.map(prediction => {
            const { confidences, ids, displayNames } = prediction;
            return {
                confidences,
                ids,
                displayNames: displayNames || []
            };
        });

        res.json({
            predictions: predictions,
            deployedModelId: response.deployedModelId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Prediction error:', error);
        
        // Reset client on auth errors
        if (error.code === 401 || error.code === 403) {
            predictionClient = null;
        }

        res.status(500).json({
            error: 'Prediction failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 5) Health Check
///////////////////////////////////////////////////////////////////////////////

app.get('/health', async (req, res) => {
    try {
        const client = await initializeVertexAI();
        
        res.status(200).json({
            status: 'ok',
            services: {
                vertexAI: 'operational'
            },
            timestamp: new Date().toISOString(),
            config: {
                projectId: CONFIG.projectId,
                location: CONFIG.location,
                lastUpdated: CONFIG.lastUpdated
            }
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 6) Error Handling Middleware
///////////////////////////////////////////////////////////////////////////////

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

///////////////////////////////////////////////////////////////////////////////
// 7) Server Startup
///////////////////////////////////////////////////////////////////////////////

async function startServer() {
    try {
        console.log('startServer function invoked');
        // Initialize Vertex AI client
        predictionClient = await initializeVertexAI();

        // Create server with improved error handling
        const server = app.listen(PORT, '0.0.0.0');
        
        // Handle server events
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

        // Improved graceful shutdown
        const shutdown = async () => {
            console.log('Shutting down gracefully...');
            
            // Close server first
            await new Promise((resolve) => {
                server.close(() => {
                    console.log('Server closed');
                    resolve();
                });
            });

            // Cleanup any active connections
            if (predictionClient) {
                try {
                    await predictionClient.close();
                    console.log('Prediction client closed');
                } catch (error) {
                    console.error('Error closing prediction client:', error);
                }
            }

            // Exit after cleanup or timeout
            const forceExit = setTimeout(() => {
                console.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);

            process.exit(0);
            clearTimeout(forceExit);
        };

        // Handle shutdown signals
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

// Start server
startServer();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
