import express from 'express';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import { PredictionServiceClient } from '@google-cloud/aiplatform';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Auth
const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Token management endpoint
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

// Prediction endpoint with token management
app.post('/predict', async (req, res) => {
    try {
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        const response = await fetch(
            `https://us-central1-aiplatform.googleapis.com/v1/projects/plucky-weaver-450819-k7/locations/us-central1/endpoints/401033999995895808:predict`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    instances: [req.body]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Prediction API error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
