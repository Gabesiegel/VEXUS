// Systematic Configuration Test for Vertex AI Predictions
import fs from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Different configurations to test
const CONFIGURATIONS = [
  // 1. Using projectNumber in URL path
  {
    name: "Config 1: Using projectNumber in URL path",
    projectId: "plucky-weaver-450819-k7", // For Secret Manager
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
      hepatic: "8159951878260523008",
      portal: "2970410926785691648",
      renal: "1148704877514326016"
    },
    buildEndpointUrl: (config, veinType) => 
      `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectNumber}/locations/${config.location}/endpoints/${config.endpointIds[veinType]}:predict`
  },
  
  // 2. Using projectId in URL path
  {
    name: "Config 2: Using projectId in URL path",
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
      hepatic: "8159951878260523008",
      portal: "2970410926785691648",
      renal: "1148704877514326016"
    },
    buildEndpointUrl: (config, veinType) => 
      `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/endpoints/${config.endpointIds[veinType]}:predict`
  },
  
  // 3. Alternative URL format without ':predict'
  {
    name: "Config 3: URL without :predict suffix",
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
      hepatic: "8159951878260523008",
      portal: "2970410926785691648",
      renal: "1148704877514326016"
    },
    buildEndpointUrl: (config, veinType) => 
      `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectNumber}/locations/${config.location}/endpoints/${config.endpointIds[veinType]}`
  },
  
  // 4. Using v1beta1 endpoint instead of v1
  {
    name: "Config 4: Using v1beta1 API endpoint",
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
      hepatic: "8159951878260523008",
      portal: "2970410926785691648",
      renal: "1148704877514326016"
    },
    buildEndpointUrl: (config, veinType) => 
      `https://${config.location}-aiplatform.googleapis.com/v1beta1/projects/${config.projectNumber}/locations/${config.location}/endpoints/${config.endpointIds[veinType]}:predict`
  }
];

// Different payload formats to test
const PAYLOAD_FORMATS = [
  {
    name: "Format 1: Standard format with mimeType",
    buildPayload: (imageContent) => ({
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
    })
  },
  {
    name: "Format 2: Image content only without mimeType",
    buildPayload: (imageContent) => ({
      instances: [
        {
          content: imageContent
        }
      ],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      }
    })
  },
  {
    name: "Format 3: Array of content strings",
    buildPayload: (imageContent) => ({
      instances: [imageContent],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      }
    })
  },
  {
    name: "Format 4: Using base64 prefix",
    buildPayload: (imageContent) => {
      // Add base64 prefix if not already present
      const contentWithPrefix = imageContent.startsWith('data:image/jpeg;base64,') 
        ? imageContent 
        : `data:image/jpeg;base64,${imageContent}`;
        
      return {
        instances: [
          {
            content: contentWithPrefix,
            mimeType: "image/jpeg"
          }
        ],
        parameters: {
          confidenceThreshold: 0.0,
          maxPredictions: 5
        }
      };
    }
  }
];

// Initialize Secret Manager client
const secretManagerClient = new SecretManagerServiceClient();

// Get credentials from Secret Manager
async function getCredentials(projectId) {
  try {
    const secretName = `projects/${projectId}/secrets/KEY/versions/latest`;
    console.log('Getting credentials from Secret Manager:', secretName);
    const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
    return JSON.parse(version.payload.data.toString());
  } catch (error) {
    console.error('Failed to get credentials from Secret Manager:', error);
    
    // Try to get access token using application default credentials instead
    console.log('Falling back to application default credentials...');
    return null;
  }
}

// Get an access token
async function getAccessToken(credentials) {
  try {
    let auth;
    
    if (credentials) {
      // Use provided credentials
      auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
    } else {
      // Use application default credentials
      auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
    }
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Load a test image
async function loadTestImage() {
  try {
    // Try to load the test image from the test_payload.json file
    const payload = JSON.parse(await fs.readFile('./test_payload.json', 'utf8'));
    return payload.instances[0].content;
  } catch (error) {
    try {
      // Try to load the test image file directly
      const imageData = await fs.readFile('./test_image.png');
      return imageData.toString('base64');
    } catch (imgErr) {
      console.error('Error loading test image:', error, imgErr);
      // Return a minimal base64 image if we can't load the test image
      return '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKACiiigAooooA//Z';
    }
  }
}

// Test a specific configuration and format
async function testConfiguration(config, formatIndex, veinType) {
  const format = PAYLOAD_FORMATS[formatIndex];
  
  try {
    console.log(`\n=== Testing ${config.name} with ${format.name} for ${veinType} vein ===`);
    
    // Get credentials and access token
    const credentials = await getCredentials(config.projectId);
    const accessToken = await getAccessToken(credentials);
    console.log(`Got access token: ${accessToken.substring(0, 10)}...`);
    
    // Load test image
    const imageContent = await loadTestImage();
    console.log(`Loaded test image (${imageContent.length} characters)`);
    
    // Build endpoint URL and payload
    const endpointUrl = config.buildEndpointUrl(config, veinType);
    console.log(`Endpoint URL: ${endpointUrl}`);
    
    const payload = format.buildPayload(imageContent);
    console.log(`Payload format: ${format.name}`);
    
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
      console.log('SUCCESS! Predictions:', JSON.stringify(responseData.predictions || responseData, null, 2).substring(0, 200) + '...');
      return { 
        success: true, 
        statusCode, 
        predictions: responseData.predictions || responseData,
        config: config.name,
        format: format.name,
        veinType
      };
    } else {
      console.error('ERROR:', responseData.error || responseData);
      return { 
        success: false, 
        statusCode, 
        error: responseData.error || responseData,
        config: config.name,
        format: format.name,
        veinType
      };
    }
  } catch (error) {
    console.error('Test failed:', error);
    return { 
      success: false, 
      error: error.toString(),
      config: config.name,
      format: format.name,
      veinType
    };
  }
}

// Run all tests and summarize results
async function runAllTests() {
  const successfulConfigurations = [];
  const failedConfigurations = [];
  
  // Test each vein type
  for (const veinType of ['hepatic', 'portal', 'renal']) {
    // Test each configuration
    for (let configIndex = 0; configIndex < CONFIGURATIONS.length; configIndex++) {
      const config = CONFIGURATIONS[configIndex];
      
      // Test each payload format
      for (let formatIndex = 0; formatIndex < PAYLOAD_FORMATS.length; formatIndex++) {
        const result = await testConfiguration(config, formatIndex, veinType);
        
        if (result.success) {
          successfulConfigurations.push(result);
        } else {
          failedConfigurations.push(result);
        }
      }
    }
  }
  
  // Print summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Total configurations tested: ${CONFIGURATIONS.length * PAYLOAD_FORMATS.length * 3}`);
  console.log(`Successful configurations: ${successfulConfigurations.length}`);
  console.log(`Failed configurations: ${failedConfigurations.length}`);
  
  if (successfulConfigurations.length > 0) {
    console.log('\n----- SUCCESSFUL CONFIGURATIONS -----');
    successfulConfigurations.forEach((result, index) => {
      console.log(`${index + 1}. ${result.config} with ${result.format} for ${result.veinType} vein`);
    });
    
    // Save successful configurations to file
    await fs.writeFile(
      './successful_configurations.json', 
      JSON.stringify(successfulConfigurations, null, 2)
    );
    console.log('\nSuccessful configurations saved to successful_configurations.json');
  }
}

// Run all tests
runAllTests(); 