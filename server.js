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
 * (Using default ADC credentials from Cloud Run's service account
 * or specify your own if needed.)
 */
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7'
};

const predictionClient = new PredictionServiceClient(options);
console.log('✅ Successfully initialized Vertex AI client');

/** 
 * Serve static files from the `dist` folder 
 * (make sure your React build actually creates `dist/`)
 */
const distPath = path.join(__dirname, 'dist');
app.use(express.json());
app.use(express.static(distPath));

/** 
 * Prediction API endpoint 
 */
app.post('/predict', async (req, res) => {
  try {
    console.log('📡 Received prediction request:', req.body);

    // Vertex AI endpoint from environment variable (set in Cloud Run)
    const endpointPath = process.env.VERTEX_AI_ENDPOINT;  
    console.log('🌍 Using Vertex AI endpoint:', endpointPath);

    // Construct request for Vertex AI
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

/**
 * For any other route, serve `index.html` from `dist/`.
 * This supports client-side routing in a React single-page app.
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

/**
 * Listen on process.env.PORT || 8080 (required by Cloud Run)
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
