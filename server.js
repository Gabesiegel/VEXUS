import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';  // Add this for fetch in Node.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize Google Auth
const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Initialize Vertex AI client
const vertexAI = new PredictionServiceClient({
    projectId: 'plucky-weaver-450819-k7',
    apiEndpoint: 'us-central1-aiplatform.googleapis.com'
});

// Middleware
app.use(express.json({ limit: '50mb' }));  // Increased limit for image handling
app.use(express.static(__dirname));

// Auth token endpoint
app.get('/auth/token', async (req, res) => {
    try {
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        res.json({
            access_token: token.token,
            expires_in: 3600
        });
    } catch (error) {
        console.error('Token error:', error);
        res.status(500).json({ error: 'Failed to get access token' });
    }
});

// Prediction endpoint
app.post('/predict', async (req, res) => {
    try {
        // Get auth token
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const endpointPath = 
            `projects/plucky-weaver-450819-k7/locations/us-central1/endpoints/401033999995895808`;

        // Make prediction request
        const response = await fetch(
            `https://us-central1-aiplatform.googleapis.com/v1/${endpointPath}:predict`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instances: [{
                        content: req.body.content,
                        mimeType: req.body.mimeType || 'image/jpeg'
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Vertex AI error:', errorData);
            throw new Error(`Vertex AI error: ${response.status}`);
        }

        const predictionResult = await response.json();
        res.json(predictionResult);

    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Error processing prediction request'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Vertex AI client initialized`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
    });
});
