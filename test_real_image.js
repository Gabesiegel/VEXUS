// Test Vertex AI with a real sample image
import fs from 'fs/promises';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

// Configuration
const CONFIG = {
  projectNumber: "456295042668",
  location: "us-central1",
  endpointIds: {
    hepatic: "8159951878260523008",
    portal: "2970410926785691648",
    renal: "1148704877514326016"
  }
};

// Load a real test image
async function loadSampleImage() {
  try {
    // Try to list files in the sample_images directory
    const files = await fs.readdir('./sample_images');
    console.log('Available sample images:', files);
    
    // Use the first image in the directory
    if (files.length > 0) {
      const imagePath = path.join('./sample_images', files[0]);
      console.log('Using sample image:', imagePath);
      
      const imageData = await fs.readFile(imagePath);
      return imageData.toString('base64');
    } else {
      throw new Error('No sample images found');
    }
  } catch (error) {
    console.error('Error loading sample image:', error);
    
    // Try loading test_image.png as fallback
    try {
      console.log('Falling back to test_image.png');
      const imageData = await fs.readFile('./test_image.png');
      return imageData.toString('base64');
    } catch (fallbackError) {
      console.error('Error loading fallback image:', fallbackError);
      throw new Error('No test images available');
    }
  }
}

// Get an access token
async function getAccessToken() {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Test the Vertex AI endpoints
async function testVertexEndpoint(veinType) {
  try {
    console.log(`\n=== Testing ${veinType} endpoint ===`);
    
    // Get access token
    const accessToken = await getAccessToken();
    console.log('Got access token');
    
    // Load the test image
    const imageContent = await loadSampleImage();
    console.log(`Loaded test image (${imageContent.length} characters)`);
    
    // Create the request payload
    const payload = {
      instances: [
        {
          content: imageContent,
          mimeType: "image/jpeg"
        }
      ],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      }
    };
    
    // Build the endpoint URL
    const endpointUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1/projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointIds[veinType]}:predict`;
    console.log('Endpoint URL:', endpointUrl);
    
    // Make the request to the Vertex AI endpoint
    console.log('Sending request to Vertex AI endpoint...');
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Check the response
    const statusCode = response.status;
    console.log(`Status code: ${statusCode}`);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('Error parsing response as JSON:', error);
      console.log('Response text:', text);
      return { success: false, statusCode, error: 'Failed to parse JSON response' };
    }
    
    // Log the response
    if (statusCode === 200) {
      console.log('SUCCESS! Predictions:', JSON.stringify(responseData.predictions || responseData, null, 2));
      return { success: true, statusCode, predictions: responseData.predictions || responseData };
    } else {
      console.error('ERROR:', responseData.error || responseData);
      return { success: false, statusCode, error: responseData.error || responseData };
    }
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.toString() };
  }
}

// Test all vein types
async function testAllVeinTypes() {
  for (const veinType of ['hepatic', 'portal', 'renal']) {
    await testVertexEndpoint(veinType);
  }
}

// Run the tests
testAllVeinTypes(); 