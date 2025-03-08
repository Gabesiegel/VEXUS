import fs from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';

// Configuration
const CONFIG = {
  onDemandEndpointService: "https://endpoints-on-demand-456295042668.us-central1.run.app"
};

// Load a test image
async function loadTestImage() {
  try {
    // Try to load the test image from the test_payload.json file
    const payload = JSON.parse(await fs.readFile('./test_payload.json', 'utf8'));
    return payload.instances[0].content;
  } catch (error) {
    console.error('Error loading test image:', error);
    // Return a minimal base64 image if we can't load the test image
    return '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKACiiigAooooA//Z';
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
    console.log('Testing on-demand service...');
    
    // Get an access token
    const accessToken = await getAccessToken();
    console.log('Got access token');
    
    // Load the test image
    const imageContent = await loadTestImage();
    console.log(`Loaded test image (${imageContent.length} characters)`);
    
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
    console.log('Using payload format: ', JSON.stringify({
      instances: [{ content: '[BASE64 IMAGE DATA]', mimeType: payload.instances[0].mimeType }],
      parameters: payload.parameters
    }, null, 2));
    
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