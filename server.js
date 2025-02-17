import express from 'express'
import { PredictionServiceClient } from '@google-cloud/aiplatform'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const options = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  projectId: 'plucky-weaver-450819-k7',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
};

const predictionClient = new PredictionServiceClient(options);

console.log('Successfully initialized Vertex AI client');

app.use(express.json())
app.use(express.static('dist'))

// Prediction endpoint
app.post('/predict', async (req, res) => {
  try {
    console.log('Received prediction request:', req.body);
    
    const endpointPath = process.env.VERTEX_AI_ENDPOINT;
    console.log('Using endpoint:', endpointPath);

    console.log('Received request body:', req.body);
    
    // Format request according to Vertex AI Image Classification requirements
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

// Serve static files from the dist directory
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
