// Working Vertex AI Prediction Demonstration
import fs from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';

// Configuration (This is the WORKING configuration)
const CONFIG = {
  projectNumber: "456295042668",
  location: "us-central1",
  endpointIds: {
    hepatic: "8159951878260523008",
    portal: "2970410926785691648",
    renal: "1148704877514326016"
  }
};

// Load the test image
async function loadTestImage() {
  try {
    const imageData = await fs.readFile('./test_image.png');
    return imageData.toString('base64');
  } catch (error) {
    console.error('Error loading test image:', error);
    throw error;
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

// Make a prediction using Vertex AI
async function makePrediction(veinType, imageBase64) {
  console.log(`\n=== Making prediction for ${veinType} vein ===`);
  
  // Construct the endpoint URL
  const endpointUrl = `https://${CONFIG.location}-aiplatform.googleapis.com/v1/projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${CONFIG.endpointIds[veinType]}:predict`;
  console.log('Endpoint URL:', endpointUrl);
  
  // Get access token
  const accessToken = await getAccessToken();
  
  // Create the request payload
  const payload = {
    instances: [
      {
        content: imageBase64,
        mimeType: "image/jpeg"
      }
    ],
    parameters: {
      confidenceThreshold: 0.0,
      maxPredictions: 5
    }
  };
  
  // Make the request
  console.log('Sending request to Vertex AI endpoint...');
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  // Parse the response
  const statusCode = response.status;
  console.log(`Status code: ${statusCode}`);
  
  if (statusCode === 200) {
    const responseData = await response.json();
    console.log('SUCCESS! Predictions:', JSON.stringify(responseData.predictions, null, 2));
    return responseData.predictions;
  } else {
    const errorData = await response.json();
    console.error('Error:', errorData);
    throw new Error(`Failed to get prediction: ${errorData.error?.message || 'Unknown error'}`);
  }
}

// Main function
async function main() {
  try {
    console.log('=== Vertex AI Prediction Demo ===');
    
    // Load the test image
    const imageBase64 = await loadTestImage();
    console.log(`Loaded test image (${imageBase64.length} characters)`);
    
    // Test all three vein types
    const results = {};
    
    for (const veinType of ['hepatic', 'portal', 'renal']) {
      try {
        results[veinType] = await makePrediction(veinType, imageBase64);
      } catch (error) {
        console.error(`Error with ${veinType} prediction:`, error);
        results[veinType] = { error: error.message };
      }
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('Prediction results:');
    
    for (const [veinType, prediction] of Object.entries(results)) {
      if (prediction.error) {
        console.log(`- ${veinType}: ERROR - ${prediction.error}`);
      } else {
        // Extract the highest confidence prediction
        const highestConfidence = prediction[0]?.confidences
          ? Math.max(...prediction[0].confidences)
          : null;
        
        const highestIndex = prediction[0]?.confidences
          ? prediction[0].confidences.indexOf(highestConfidence)
          : null;
        
        const bestClass = highestIndex !== null
          ? prediction[0].displayNames[highestIndex]
          : 'unknown';
        
        console.log(`- ${veinType}: ${bestClass} (${highestConfidence ? (highestConfidence * 100).toFixed(2) : 'unknown'}%)`);
      }
    }
    
  } catch (error) {
    console.error('Main process failed:', error);
  }
}

// Run the demo
main(); 