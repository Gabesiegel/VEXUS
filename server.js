import express from 'express';
import { AI } from '@google-cloud/aiplatform';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CRITICAL FIX: Explicitly parse port as integer and validate
const port = parseInt(process.env.PORT || '8080', 10);
if (isNaN(port)) {
    console.error('Invalid PORT value');
    process.exit(1);
}

// Updated configuration with current timestamp
const CONFIG = {
    projectId: 'plucky-weaver-450819-k7',
    modelId: '1401033999995895808',
    lastUpdated: '2025-02-18 03:11:52',
    developer: 'Gabesiegel'
};

// CRITICAL FIX: Add error handling middleware first
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        timestamp: CONFIG.lastUpdated
    });
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));

// CRITICAL FIX: Check if build directory exists
import fs from 'fs';
const buildPath = path.join(process.cwd(), 'build');
if (!fs.existsSync(buildPath)) {
    console.error('Build directory not found:', buildPath);
    process.exit(1);
}

// Serve static files from the React build directory
app.use(express.static(buildPath));

// CRITICAL FIX: Cloud Run health check endpoint
app.get('/_ah/warmup', (req, res) => {
    res.status(200).send('OK');
});

// Explicit health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: CONFIG.lastUpdated
    });
});

// Initialize Google Cloud AI Platform client
const aiplatformClient = new AI({
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

// Endpoint for predictions
app.post('/predict', async (req, res) => {
    try {
        const { content, mimeType } = req.body;
        
        if (!content || !mimeType) {
            return res.status(400).json({ 
                error: 'Missing content or mimeType',
                timestamp: CONFIG.lastUpdated
            });
        }

        const prediction = await aiplatformClient.predict({
            endpoint: process.env.VERTEX_AI_ENDPOINT,
            instances: [{
                content: content,
                mimeType: mimeType
            }]
        });

        res.json(prediction);
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ 
            error: error.message,
            timestamp: CONFIG.lastUpdated
        });
    }
});

// Handle React routing
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// CRITICAL FIX: Proper server startup with error handling
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] Server starting...`);
    console.log(`Server running at http://0.0.0.0:${port}`);
    console.log(`Project ID: ${CONFIG.projectId}`);
    console.log(`Last Updated: ${CONFIG.lastUpdated}`);
    console.log(`Static files directory: ${buildPath}`);
}).on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

// CRITICAL FIX: Graceful shutdown
const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// CRITICAL FIX: Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
