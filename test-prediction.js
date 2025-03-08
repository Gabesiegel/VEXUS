import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// Configuration
const config = {
  serverUrl: 'http://localhost:3000', // Update if your server runs on a different port
  veinType: 'hepatic',
  imagePath: './sample_images/test_image.jpg' // Update with the path to your test image
};

// Utility to convert an image file to base64
async function imageFileToBase64(filePath) {
  try {
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  } catch (error) {
    console.error(`Error reading image file ${filePath}:`, error);
    return null;
  }
}

async function testPrediction() {
  console.log('======= TESTING VEXUS PREDICTION API =======');
  console.log(`Testing vein type: ${config.veinType}`);
  
  try {
    // Read and convert image
    console.log(`Reading image from: ${config.imagePath}`);
    const base64Image = await imageFileToBase64(config.imagePath);
    
    if (!base64Image) {
      console.error('Failed to load test image');
      return;
    }
    
    console.log(`Successfully loaded image (${base64Image.length} bytes)`);
    
    // Create API payload
    const payload = {
      image: base64Image,
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      }
    };
    
    // Make API call
    console.log(`Making prediction request to: ${config.serverUrl}/api/predict/${config.veinType}`);
    
    const startTime = Date.now();
    const response = await fetch(`${config.serverUrl}/api/predict/${config.veinType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Get response
    const result = await response.json();
    
    console.log(`Request completed in ${duration}ms with status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ SUCCESS! The prediction API is working correctly.');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ ERROR: The prediction API returned an error:');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ FATAL ERROR: Failed to complete the test:');
    console.error(error);
  }
  
  console.log('======= TEST COMPLETE =======');
}

// Run the test
testPrediction(); 