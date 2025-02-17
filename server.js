import express from 'express';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM helper for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**
 * Configure Vertex AI client
 * Use default Application Default Credentials (no manual key needed)
 */
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7'
};
const predictionClient = new PredictionServiceClient(options);
console.log('✅ Successfully initialized Vertex AI client');

/**
 * Serve static files from the React 'build' folder
 * (Make sure `npm run build` actually creates `build/`).
 */
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Prediction API endpoint
app.post('/predict', async (req, res) => {
  try {
    console.log('📡 Received prediction request:', req.body);

    const endpointPath = process.env.VERTEX_AI_ENDPOINT; // from Cloud Run env var
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
    res.status(500).json({
      error: 'Failed to make prediction',
      message: error.message
    });
  }
});

/**
 * Catch-all route for client-side routing
 * If your React app uses React Router, this ensures deep links still load.
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

/**
 * Start listening on port 8080 (or the value of process.env.PORT)
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
