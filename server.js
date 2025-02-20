import express from 'express';
import { v1 } from '@google-cloud/aiplatform';
import { GoogleAuth } from 'google-auth-library';
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
    location: "us-central1", // Finally!
    endpointId: "7513685331732856832",
    vertexEndpoint: "projects/plucky-weaver-450819-k7/locations/us-central1/endpoints/7513685331732856832",
    lastUpdated: new Date().toISOString(),
    developer: 'Gabesiegel'
};

// Initialize Vertex AI client
async function initializeVertexAI() {
    try {
        console.log('Initializing Vertex AI client with Application Default Credentials.');
        const credentialsPath = '/secrets/KEY'; // Updated secret path
        const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
        const credentials = JSON.parse(credentialsContent);
        return new v1.PredictionServiceClient({
            credentials,
            apiEndpoint: 'us-central1-aiplatform.googleapis.com',
            projectId: CONFIG.projectId,
            location: CONFIG.location,
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
const port = parseInt(process.env.PORT || '8080', 10);

if (isNaN(port)) {
    console.error('Invalid PORT value');
    process.exit(1);
}

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
        const auth = new GoogleAuth();
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        console.log("Token before check:", token);

        if (!token || !token.token) {
            throw new Error('Failed to retrieve access token');
        }
        console.log("Token after check:", token);

        res.json({
            access_token: token.token,
            expires_in: token.expires_in,
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
        if (!predictionClient) {
            predictionClient = await initializeVertexAI();
        }

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

        const request = {
            endpoint: CONFIG.vertexEndpoint,
            instances: instances.map(instance => ({
                content: instance.b64 // Use 'content' for base64 data
            })),
            parameters: {          // Add parameters
                confidenceThreshold: 0.5,
                maxPredictions: 5
            }
        };

        console.log('Prediction request:', request);
        const [response] = await predictionClient.predict(request);
        console.log('Prediction response:', response);

        if (!response || !response.predictions) {
            throw new Error('Invalid response from Vertex AI');
        }

        // Extract display names, if available
        const predictions = response.predictions.map(prediction => {
            const { confidences, ids, displayNames } = prediction;
            return {
                confidences,
                ids,
                displayNames: displayNames || [] // Ensure displayNames is an array
            };
        });

        res.json({
            predictions: predictions, // Use processed predictions
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
        // Initialize Vertex AI client
        predictionClient = await initializeVertexAI();
        
        const server = app.listen(port, '0.0.0.0', () => {
            console.log(`[${new Date().toISOString()}] Server starting...`);
            console.log(`Server running at http://0.0.0.0:${port}`);
            console.log(`Project ID: ${CONFIG.projectId}`);
            console.log(`Last Updated: ${CONFIG.lastUpdated}`);
        });

        // Graceful shutdown
        const shutdown = () => {
            console.log('Shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
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
