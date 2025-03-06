import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test image
const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');

// Read image as base64
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

// Create payload with proper structure for Vertex AI
// Vertex AI Image Classification expects just the base64 content
const payload = {
  instances: [
    {
      content: base64Image
    }
  ],
  parameters: {
    confidenceThreshold: 0.0,
    maxPredictions: 5
  }
};

// Test the API
async function testPredictAPI() {
  console.log('Testing /api/predict endpoint with Vertex AI image classification format...');
  console.log(`Image size: ${Math.round(imageBuffer.length / 1024)} KB`);
  
  try {
    // Send request to the API
    const response = await fetch('http://localhost:3002/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    console.log('Successfully received predictions:');
    console.log('Top predictions:');
    
    if (result.displayNames && result.confidences) {
      result.displayNames.forEach((name, index) => {
        const confidence = result.confidences[index];
        console.log(`- ${name}: ${(confidence * 100).toFixed(1)}%`);
      });
    } else {
      console.log('Unexpected response format:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPredictAPI(); 