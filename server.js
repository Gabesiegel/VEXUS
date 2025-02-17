import express from 'express'
import { PredictionServiceClient } from '@google-cloud/aiplatform'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// ESM helper to get __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Configure Vertex AI Prediction client
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7',
  // If you're running on Cloud Run with a service account, you can omit keyFilename
  // and rely on Application Default Credentials. But if you still need the key file:
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
};
const predictionClient = new PredictionServiceClient(options);
console.log('Successfully initialized Vertex AI client');

app.use(express.json())

// Serve static files from "dist" folder (e.g. your React build)
app.use(express.static('dist'))

// Prediction endpoint
app.post('/predict', async (req, res) => {
  try {
    console.log('Received prediction request:', req.body);
    
    const endpointPath = process.env.VERTEX_AI_ENDPOINT;
    console.log('Using endpoint:', endpointPath);

    // Format request for Vertex AI
    const request = {
      name: endpointPath,
      payload: {
        instances: [
          {
            content: req.body.content,
            mimeType: 'image/jpeg'
          }
        ]
      }
    };

    console.log('Making prediction request with payload:', JSON.stringify({
      name: endpointPath,
      instanceCount: 1,
      mimeType: 'image/jpeg'
    }));

    const [response] = await predictionClient.predict(request);
    console.log('Received raw response:', response);

    // Format response for frontend
    const formattedResponse = {
      predictions: [{
        confidences: response.predictions?.[0]?.confidences || [],
        labels: response.predictions?.[0]?.displayNames || []
      }]
    };

    console.log('Sending formatted response:', formattedResponse);
    res.json(formattedResponse);
  } catch (error) {
    console.error('Error details:', {
      code: error.code,
      details: error.details,
      metadata: error.metadata,
      stack: error.stack
    });

    res.status(500).json({ 
      error: 'Failed to make prediction',
      message: error.message,
      details: error.details || 'No additional details available'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  })
})

// Fallback to index.html for client-side routing (React, etc.)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// IMPORTANT: Use PORT=8080 for Cloud Run, or fallback to 3000 locally
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
