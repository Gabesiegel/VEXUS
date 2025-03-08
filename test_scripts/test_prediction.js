// Simple script to test prediction endpoint

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  apiEndpoint: 'http://localhost:3002/api/predict',
  imagePath: './test_images/hepatic.jpg' // Path to a test image
};

// Function to convert image to base64
function imageToBase64(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Image file not found: ${filePath}`);
      return null;
    }
    const imageBuffer = fs.readFileSync(filePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

// Function to test prediction
async function testPrediction(veinType = 'hepatic') {
  try {
    // Check if we have an image
    if (!fs.existsSync(config.imagePath)) {
      console.error(`Test image not found at ${config.imagePath}`);
      return;
    }

    // Convert image to base64
    const base64Image = imageToBase64(config.imagePath);
    if (!base64Image) {
      console.error('Failed to convert image to base64');
      return;
    }

    console.log(`Testing prediction for ${veinType} vein...`);
    
    // Create the payload
    const payload = {
      instances: [
        {
          content: base64Image,
          mimeType: 'image/jpeg'
        }
      ],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      },
      metadata: {
        veinType: veinType,
        imageType: 'image/jpeg',
        timestamp: Date.now(),
        onlyOnDemand: true  // Explicitly use on-demand service
      }
    };

    // Make the request
    console.log(`Sending request to ${config.apiEndpoint}...`);
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Prediction failed with status ${response.status}: ${errorText}`);
      return;
    }

    // Process the response
    const result = await response.json();
    console.log('Prediction successful!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // Check for displayNames and confidences
    if (result.displayNames && result.displayNames.length > 0) {
      console.log('\nTop predictions:');
      result.displayNames.forEach((name, index) => {
        const confidence = result.confidences[index];
        console.log(`${name}: ${(confidence * 100).toFixed(2)}%`);
      });
    }
    
    console.log(`\nPrediction method: ${result.method || 'unknown'}`);
    console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
  } catch (error) {
    console.error('Error during prediction test:', error);
  }
}

// Main function
async function main() {
  // Create test_images directory if it doesn't exist
  const testImagesDir = './test_images';
  if (!fs.existsSync(testImagesDir)) {
    fs.mkdirSync(testImagesDir);
    console.log('Created test_images directory. Please add test images before running the test.');
    return;
  }
  
  await testPrediction('hepatic');
}

main(); 