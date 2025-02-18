import express from 'express';
import { AI } from '@google-cloud/aiplatform';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use the PORT environment variable provided by Cloud Run
const port = process.env.PORT || 8080;

// Updated configuration with latest timestamp
const CONFIG = {
    projectId: 'plucky-weaver-450819-k7',
    modelId: '1401033999995895808',
    lastUpdated: '2025-02-18 02:43:31',
    developer: 'Gabesiegel'
};

app.use(express.json({ limit: '50mb' }));

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'build')));

// Initialize Google Cloud AI Platform client
const aiplatformClient = new AI({
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

// Endpoint for predictions
app.post('/predict', async (req, res) => {
    try {
        const { content, mimeType } = req.body;

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
        res.status(500).json({ error: error.message });
    }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Project ID: ${CONFIG.projectId}`);
    console.log(`Last Updated: ${CONFIG.lastUpdated}`);
});
