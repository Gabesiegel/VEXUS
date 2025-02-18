import express from 'express';
import { AI } from '@google-cloud/aiplatform';

const app = express();
const port = process.env.PORT || 3000;

// Updated configuration
const CONFIG = {
    projectId: 'plucky-weaver-450819-k7',
    modelId: '1401033999995895808',
    location: 'us-central1',
    lastUpdated: '2025-02-18 01:15:02',
    developer: 'Gabesiegel'
};

app.use(express.json({ limit: '50mb' }));

// Initialize Google Cloud AI Platform client
const aiplatformClient = new AI({
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

// Endpoint for predictions
app.post('/predict', async (req, res) => {
    try {
        const { content, mimeType } = req.body;

        const prediction = await aiplatformClient.predict({
            endpoint: `projects/${CONFIG.projectId}/locations/${CONFIG.location}/endpoints/${CONFIG.modelId}`,
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Project ID: ${CONFIG.projectId}`);
    console.log(`Last Updated: ${CONFIG.lastUpdated}`);
});
