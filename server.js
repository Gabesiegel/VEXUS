import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v1 } from '@google-cloud/aiplatform';
const { PredictionServiceClient } = v1;

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CRITICAL: Parse the PORT as integer
const port = parseInt(process.env.PORT || '8080', 10);
if (isNaN(port)) {
  console.error('Invalid PORT value');
  process.exit(1);
}

// Updated configuration (example fields)
const CONFIG = {
  projectId: 'plucky-weaver-450819-k7',
  modelId: '1401033999995895808',
  lastUpdated: '2025-02-18 03:11:52',
  developer: 'Gabesiegel'
};

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));

// Determine the build folder path
const buildPath = path.join(__dirname, 'build');

// Optional: Warn (but don’t crash) if the build folder is missing
if (!fs.existsSync(buildPath)) {
  console.warn('Warning: Build directory not found:', buildPath);
}

// Serve the static files from the React build directory
app.use(express.static(buildPath));

// Health-check endpoints (Cloud Run warmup & explicit)
app.get('/_ah/warmup', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: CONFIG.lastUpdated
  });
});

// Initialize Google Cloud AI Platform client
const aiplatformClient = new AI({
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

// Endpoint for predictions
app.post('/predict', async (req, res) => {
  try {
    const { content, mimeType } = req.body;
    if (!content || !mimeType) {
      return res.status(400).json({
        error: 'Missing content or mimeType',
        timestamp: CONFIG.lastUpdated
      });
    }

    const prediction = await aiplatformClient.predict({
      endpoint: process.env.VERTEX_AI_ENDPOINT,
      instances: [{
        content,
        mimeType
      }]
    });

    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: CONFIG.lastUpdated
    });
  }
});

// Catch-all route to serve the React index.html (if build directory exists)
app.get('*', (req, res, next) => {
  if (!fs.existsSync(buildPath)) {
    return res.status(404).send('Build folder not found.');
  }
  res.sendFile(path.join(buildPath, 'index.html'));
});

// LAST: Error handling middleware
app.use((err, req, res, next) => {
  console.error('Uncaught Express error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: CONFIG.lastUpdated
  });
});

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Server starting...`);
  console.log(`Server running on port ${port}`);
  console.log(`Project ID: ${CONFIG.projectId}`);
  console.log(`Last Updated: ${CONFIG.lastUpdated}`);
  console.log(`Static files directory: ${buildPath}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions & rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', promise, 'reason:', reason);
  shutdown();
});
