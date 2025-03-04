import fetch from 'node-fetch';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { GoogleAuth } from 'google-auth-library';

const execAsync = promisify(exec);

const CONFIG = {
  projectId: "plucky-weaver-450819-k7",
  location: "us-central1",
  endpointIds: {
    hepatic: "8159951878260523008",
    portal: "2970410926785691648",
    renal: "1148704877514326016"
  }
};

// Function to get authentication token
async function getAuthToken() {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
}

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

// Function to get the MIME type of an image
async function getMimeType(filePath) {
  try {
    const { stdout } = await execAsync(`file --mime-type -b "${filePath}"`);
    return stdout.trim();
  } catch (error) {
    console.error(`Error getting MIME type: ${error.message}`);
    return 'image/png'; // Default to png if we can't determine
  }
}

async function resizeImage(buffer) {
    return await sharp(buffer)
        .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
}

// Function to test the API endpoint with a specific format
async function testApiEndpoint(imageFile, veinType, useDataUrlPrefix = false) {
  const formatName = useDataUrlPrefix ? "with data URL prefix" : "without data URL prefix";
  console.log(`\n----- Testing ${veinType} (${formatName}) -----`);
  
  try {
    // Get auth token
    const token = await getAuthToken();
    
    console.log(`Reading image from: ${imageFile}`);
    const imageBuffer = await fs.readFile(imageFile);
    
    // Resize image before converting to base64
    const resizedBuffer = await resizeImage(imageBuffer);
    const base64Image = resizedBuffer.toString('base64');
    
    console.log(`Image read successfully, Base64 length: ${base64Image.length}`);
    
    let content;
    if (useDataUrlPrefix) {
        content = `data:image/jpeg;base64,${base64Image}`;
    } else {
        content = base64Image;
    }
    
    // Create payload
    const payload = {
      instances: [
        {
          content: content
        }
      ],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      },
      metadata: {
        veinType: veinType.toLowerCase().split(' ')[0],
        imageType: 'image/jpeg',
        timestamp: Date.now()
      }
    };

    console.log(`Sending request to /api/predict endpoint for ${veinType} (${formatName})...`);
    
    const response = await fetch('http://0.0.0.0:3002/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`${veinType} (${formatName}) API Response:`, JSON.stringify(result, null, 2));
    console.log(`${veinType} (${formatName}) test completed successfully!`);
    return true;
  } catch (error) {
    console.error(`${veinType} (${formatName}) test failed:`, error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  try {
    console.log("Starting API endpoint tests...");
    
    // Test each vein type
    const tests = [
      { path: 'public/test_hepatic.png', name: 'Hepatic Vein' },
      { path: 'public/test_portal.png', name: 'Portal Vein' },
      { path: 'public/test_renal.png', name: 'Renal Vein' }
    ];
    
    let successCount = 0;
    let totalTests = tests.length * 2; // Testing each image with both formats
    
    for (const test of tests) {
      // Test without data URL prefix
      const successWithout = await testApiEndpoint(test.path, test.name, false);
      if (successWithout) successCount++;
      
      // Test with data URL prefix
      const successWith = await testApiEndpoint(test.path, test.name, true);
      if (successWith) successCount++;
    }
    
    console.log(`\n----- Test Summary -----`);
    console.log(`${successCount} of ${totalTests} tests passed.`);
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run the tests
runAllTests(); 