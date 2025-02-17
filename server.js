import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Optional: Vertex AI client if you have a /predict route
import { PredictionServiceClient } from '@google-cloud/aiplatform';

// __dirname in ES modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure Vertex AI with your project
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7'
};
const predictionClient = new PredictionServiceClient(options);
console.log('✅ Vertex AI client initialized.');

// Parse JSON bodies
app.use(express.json());

// Serve React’s build output
app.use(express.static(path.join(__dirname, 'build')));

/**
 * Example route: /predict
 * This calls your Vertex AI endpoint for predictions.
 * If you don’t need it, remove this route entirely.
 */
app.post('/predict', async (req, res) => {
  try {
    console.log('📡 Received /predict request:', req.body);

    // Use your real endpoint ID, or read from ENV. Hard-coded fallback here:
    const endpointPath =
      process.env.VERTEX_AI_ENDPOINT ||
      'projects/plucky-weaver-450819-k7/locations/us-central1/endpoints/401033999995895808';

    // Format request
    const request = {
      name: endpointPath,
      instances: [
        {
          content: req.body.content,
          mimeType: 'image/jpeg' // or the relevant MIME type
        }
      ]
    };

    // Perform prediction
    const [response] = await predictionClient.predict(request);
    console.log('✅ Vertex AI response:', response);

    res.json(response);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// For React client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Cloud Run sets PORT env var. Fallback to 8080 if not set.
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
