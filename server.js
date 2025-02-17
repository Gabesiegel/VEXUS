import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PredictionServiceClient } from '@google-cloud/aiplatform';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure Vertex AI
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7'
};
const predictionClient = new PredictionServiceClient(options);
console.log('✅ Vertex AI client initialized.');

// Parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve React build files
app.use('/app', express.static(path.join(__dirname, 'build')));

// Vertex AI prediction endpoint
app.post('/predict', async (req, res) => {
  try {
    console.log('📡 Received /predict request:', req.body);
    const endpointPath = process.env.VERTEX_AI_ENDPOINT ||
      'projects/plucky-weaver-450819-k7/locations/us-central1/endpoints/401033999995895808';
    
    const request = {
      name: endpointPath,
      instances: [
        {
          content: req.body.content,
          mimeType: 'image/jpeg'
        }
      ]
    };
    
    const [response] = await predictionClient.predict(request);
    console.log('✅ Vertex AI response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle React routes
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Handle all other routes by serving static HTML files
app.get('*', (req, res, next) => {
  next();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
