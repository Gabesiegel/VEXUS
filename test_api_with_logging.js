const fs = require('fs');
const https = require('https');
const { GoogleAuth } = require('google-auth-library');

async function testPrediction(projectId, location, endpointId) {
  try {
    // Load the input data
    const inputData = JSON.parse(fs.readFileSync('input.json', 'utf8'));
    
    // Create the request URL
    const apiEndpoint = `${location}-aiplatform.googleapis.com`;
    const url = `https://${apiEndpoint}/v1/projects/${projectId}/locations/${location}/endpoints/${endpointId}:predict`;
    
    console.log(`Sending request to: ${url}`);
    
    // Get authentication client
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    // Create request options
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    };
    
    // Make the request
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`Response status code: ${res.statusCode}`);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonResponse = JSON.parse(data);
              console.log('Response received successfully:');
              console.log(JSON.stringify(jsonResponse, null, 2));
              resolve(jsonResponse);
            } catch (error) {
              console.error('Error parsing JSON response:', error);
              console.log('Raw response:', data);
              reject(error);
            }
          } else {
            console.error(`Error response (${res.statusCode}):`);
            console.log(data);
            reject(new Error(`Request failed with status code ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Request error:', error);
        reject(error);
      });
      
      // Send the request data
      req.write(JSON.stringify(inputData));
      req.end();
    });
  } catch (error) {
    console.error('Error in testPrediction:', error);
    throw error;
  }
}

// Get command line arguments
const [projectId, location, endpointId] = process.argv.slice(2);

if (!projectId || !location || !endpointId) {
  console.error('Usage: node test_api_with_logging.js PROJECT_ID LOCATION ENDPOINT_ID');
  process.exit(1);
}

// Run the test
testPrediction(projectId, location, endpointId)
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err)); 