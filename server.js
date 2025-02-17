import express from 'express';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure Vertex AI Prediction client
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7'
};

// Use credentials only if running locally
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const predictionClient = new PredictionServiceClient(options);
console.log('✅ Successfully initialized Vertex AI client');

app.use(express.json());
app.use(express.static('dist')); // Serve React frontend

// Prediction API endpoint
app.post('/predict', async (req, res) => {
  try {
    console.log('📡 Received prediction request:', req.body);

    const endpointPath = process.env.VERTEX_AI_ENDPOINT;
    console.log('🌍 Using Vertex AI endpoint:', endpointPath);

    const request = {
      name: endpointPath,
      instances: [
        {
          content: req.body.content,
          mimeType: 'image/jpeg'
        }
      ]
    };

    console.log('🛠 Sending request to Vertex AI...');
    const [response] = await predictionClient.predict(request);
    console.log('✅ Vertex AI response:', response);

    const formattedResponse = {
      predictions: [{
        confidences: response.predictions?.[0]?.confidences || [],
        labels: response.predictions?.[0]?.displayNames || []
      }]
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to make prediction', message: error.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Ensure correct Cloud Run port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
