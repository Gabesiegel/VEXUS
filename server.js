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
 * Using Application Default Credentials
 * And specifying project + endpoint
 */
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7'
};
const predictionClient = new PredictionServiceClient(options);
console.log('✅ Successfully initialized Vertex AI client');

/**
 * Serve the compiled React files from the "build" directory
 * Ensure you actually run "npm run build" so "build/" is created
 */
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

/**
 * Prediction API endpoint
 */
app.post('/predict', async (req, res) => {
  try {
    console.log('📡 Received prediction request:', req.body);

    // The environment variable must be set in Cloud Run
    // e.g. --set-env-vars=VERTEX_AI_ENDPOINT=projects/PROJECT_ID/locations/us-central1/endpoints/ENDPOINT_ID
    const endpointPath = process.env.VERTEX_AI_ENDPOINT;
    console.log('🌍 Using Vertex AI endpoint:', endpointPath);

    // Build the request
    const request = {
      name: endpointPath,
      instances: [
        {
          content: req.body.content,  // base64 or relevant data
          mimeType: 'image/jpeg'
        }
      ]
    };

    console.log('🛠 Sending request to Vertex AI...');
    const [response] = await predictionClient.predict(request);
    console.log('✅ Vertex AI response:', response);

    // Format the response for your frontend
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
 * Catch-all route for client-side React Router
 * This ensures any unrecognized route returns index.html
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

/**
 * Start listening on the port set by Cloud Run (8080 by default)
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
