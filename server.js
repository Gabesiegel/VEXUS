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

// Check build directory exists
async function checkBuildDir() {
    try {
        await fs.access(path.join(__dirname, 'build'));
        console.log('Build directory exists');
    } catch (error) {
        console.warn('Build directory not found:', error.message);
    }
}
checkBuildDir();

///////////////////////////////////////////////////////////////////////////////
// 1) Configuration Setup
///////////////////////////////////////////////////////////////////////////////

const CONFIG = {
    projectId: process.env.PROJECT_ID || '456295042668',
    modelId: process.env.MODEL_ID || '5669602021812994048',
    location: process.env.LOCATION || 'us-central1',
    endpointId: process.env.ENDPOINT_ID || '5669602021812994048',
    vertexEndpoint: process.env.VERTEX_AI_ENDPOINT || 'projects/456295042668/locations/us-central1/endpoints/5669602021812994048',
    lastUpdated: '2025-02-18 07:02:03',
    developer: 'Gabesiegel'
};

// Initialize Vertex AI client from environment variable
async function initializeVertexAI() {
    try {
        // Read the JSON creds from environment
        const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!credsJson) {
    console.warn('Vertex AI: No credentials found. Starting server without Vertex AI capabilities.');
    return null;
}

        const credentials = JSON.parse(credsJson);
        if (!credentials.client_email || !credentials.private_key) {
    console.warn('Vertex AI: Credentials missing required fields (client_email or private_key). Starting anyway without Vertex AI capabilities.');
    return null;
}

        console.log('Vertex AI: Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable.');

        // Initialize Vertex AI client
        return new v1.PredictionServiceClient({
            credentials,
            apiEndpoint: 'us-central1-aiplatform.googleapis.com',
            projectId: CONFIG.projectId,
            location: CONFIG.location
        });
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
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
// Log static file requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Requesting: ${req.url}`);
    next();
});

// Serve static files from both build and public directories
app.use(express.static(path.join(__dirname, 'build')));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for HTML5 history API
app.get('*', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fallback for: ${req.url}`);
    // Try build directory first, then public
    const buildPath = path.join(__dirname, 'build', 'calculator.html');
    const publicPath = path.join(__dirname, 'public', 'calculator.html');
    
    if ((await fs.stat(buildPath).catch(() => false))) {
        res.sendFile(buildPath);
    } else {
        res.sendFile(publicPath);
    }
});

///////////////////////////////////////////////////////////////////////////////
// 3) Authentication Endpoint
///////////////////////////////////////////////////////////////////////////////

app.post('/auth/token', async (req, res) => {
    try {
        // Use the same environment-based credentials
        const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (!credsJson) {
            throw new Error('No environment variable GOOGLE_APPLICATION_CREDENTIALS_JSON found.');
        }
        const credentials = JSON.parse(credsJson);
        if (!credentials.client_email || !credentials.private_key) {
            throw new Error('Credentials missing required fields (client_email or private_key)');
        }

        console.log('Auth: Initializing with service account:', credentials.client_email);

        const auth = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        console.log('Attempting to get access token...');
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        if (!token || !token.token) {
            throw new Error('No token in response');
        }

        console.log('Successfully obtained access token');
        res.json({
            access_token: token.token,
            expires_in: 3600,
            timestamp: CONFIG.lastUpdated
        });
    } catch (error) {
        console.error('Auth error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        // Send more detailed error response
        res.status(500).json({
            error: 'Authentication failed',
            message: error.message,
            details: error.code ? `Error code: ${error.code}` : undefined,
            timestamp: CONFIG.lastUpdated
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 4) Prediction Endpoint with Error Handling
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
                timestamp: CONFIG.lastUpdated
            });
        }

        // Validate each instance
        for (const instance of instances) {
            if (!instance.b64 || !instance.mime_type) {
                return res.status(400).json({
                    error: 'Each instance must have b64 and mime_type',
                    timestamp: CONFIG.lastUpdated
                });
            }
        }

        const request = {
            endpoint: CONFIG.vertexEndpoint,
            instances: instances
        };

        const [response] = await predictionClient.predict(request);

        // Add detailed response validation
        if (!response || !response.predictions) {
            throw new Error('Invalid response from Vertex AI');
        }

        res.json({
            predictions: response.predictions,
            deployedModelId: response.deployedModelId,
            timestamp: CONFIG.lastUpdated
        });

    } catch (error) {
        console.error('Prediction error:', error);
        
        // Reset client on error
        if (error.code === 401 || error.code === 403) {
            predictionClient = null;
        }

        res.status(500).json({
            error: 'Prediction failed',
            message: error.message,
            timestamp: CONFIG.lastUpdated
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 5) Health Check
///////////////////////////////////////////////////////////////////////////////

app.get('/health', async (req, res) => {
    try {
        // Test Vertex AI client initialization
        const client = await initializeVertexAI();
        
        res.status(200).json({
            status: 'ok',
            services: {
                vertexAI: 'operational'
            },
            timestamp: CONFIG.lastUpdated,
            config: {
                projectId: CONFIG.projectId,
                location: CONFIG.location,
                lastUpdated: CONFIG.lastUpdated
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: CONFIG.lastUpdated
        });
    }
});

///////////////////////////////////////////////////////////////////////////////
// 6) Error Handling Middleware
///////////////////////////////////////////////////////////////////////////////

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: CONFIG.lastUpdated
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
            console.log(`Developer: ${CONFIG.developer}`);
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
