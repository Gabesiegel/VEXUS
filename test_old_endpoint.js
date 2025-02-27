import fetch from 'node-fetch';
import fs from 'fs/promises';

// Function to read an image file and convert to base64
async function imageToBase64(imagePath) {
  try {
    const imageData = await fs.readFile(imagePath);
    return imageData.toString('base64');
  } catch (error) {
    console.error(`Error reading image: ${error.message}`);
    throw error;
  }
}

// Function to test the API endpoint
async function testApiEndpoint() {
  try {
    // Use a test image if one exists in the public directory
    const imagePath = 'public/test_upload.jpeg';
    
    console.log(`Reading image from: ${imagePath}`);
    const base64Content = await imageToBase64(imagePath);
    console.log(`Image read successfully: ${base64Content.substring(0, 50)}...`);
    console.log(`Base64 length: ${base64Content.length}`);
    
    // Create payload in correct format for the original /predict endpoint
    const payload = {
      instances: [
        {
          content: base64Content
        }
      ],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      }
    };

    console.log('Sending request to original /predict endpoint...');
    try {
      const response = await fetch('http://127.0.0.1:3003/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));
      console.log('Test completed successfully!');
    } catch (error) {
      console.error('API request failed:', error);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testApiEndpoint(); 