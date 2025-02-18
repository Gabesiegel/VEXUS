import express from 'express';
import { AI } from '@google-cloud/aiplatform';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use the PORT environment variable provided by Cloud Run
const port = process.env.PORT || 8080;

// Updated configuration with current timestamp
const CONFIG = {
    projectId: 'plucky-weaver-450819-k7',
    modelId: '1401033999995895808',
    lastUpdated: '2025-02-18 02:57:41',
    developer: 'Gabesiegel'
};

// Body parsing middleware - MUST be before route handlers
app.use(express.json({ limit: '50mb' }));

// CRITICAL: Serve static files from the correct build path
app.use(express.static('build'));

// Health check endpoint - REQUIRED for Cloud Run
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
        
        // Add validation
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

// CRITICAL: This must be after all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// CRITICAL: Listen on 0.0.0.0 to accept all incoming connections
app.listen(port, '0.0.0.0', () => {
    console.log('Server starting...', new Date().toISOString());
    console.log(`Listening on port ${port}`);
    console.log(`Project ID: ${CONFIG.projectId}`);
    console.log(`Last Updated: ${CONFIG.lastUpdated}`);
    console.log(`Static files directory: ${path.join(__dirname, 'build')}`);
});
