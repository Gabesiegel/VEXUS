import fs from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

// Configuration
const CONFIG = {
  onDemandEndpointService: "https://endpoints-on-demand-456295042668.us-central1.run.app"
};

// Download an image from the internet and convert to base64
async function getInternetImage() {
  try {
    // Use a simple sample image from the internet
    const imageUrl = 'https://storage.googleapis.com/cloud-samples-data/ai-platform/flowers/daisy/100080576_f52e8ee070_n.jpg';
    console.log(`Downloading sample image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    console.log(`Downloaded image, size: ${buffer.length} bytes`);
    
    // Convert to base64
    const base64Image = buffer.toString('base64');
    return base64Image;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Get an access token
async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// Test the on-demand service
async function testOnDemandService() {
  try {
    console.log('Testing on-demand service with internet image...');
    
    // Get an access token
    const accessToken = await getAccessToken();
    console.log('Got access token');
    
    // Get an image from the internet
    const imageContent = await getInternetImage();
    console.log(`Loaded internet image (${imageContent.length} characters)`);
    
    // Create the request payload with the exact format that worked in tests
    const payload = {
      "instances": [
        {
          "content": imageContent,
          "mimeType": "image/jpeg"
        }
      ],
      "parameters": {
        "confidenceThreshold": 0.0,
        "maxPredictions": 5
      }
    };
    
    console.log('Sending request to on-demand service...');
    
    // Make the request to the on-demand service
    const onDemandEndpoint = `${CONFIG.onDemandEndpointService}/predict/hepatic`;
    
    const response = await fetch(onDemandEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Check the response
    const statusCode = response.status;
    console.log(`On-demand service responded with status code: ${statusCode}`);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('Error parsing response as JSON:', error);
      console.log('Response text:', text);
      return;
    }
    
    // Log the response
    if (statusCode === 200) {
      console.log('On-demand service response:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('On-demand service error:', responseData);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testOnDemandService(); 