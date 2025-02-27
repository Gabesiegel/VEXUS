import fetch from 'node-fetch';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

// Function to test the API endpoint with a specific format
async function testApiEndpoint(imagePath, testName, useDataUrlPrefix = false) {
  const formatName = useDataUrlPrefix ? "with data URL prefix" : "without data URL prefix";
  console.log(`\n----- Testing ${testName} (${formatName}) -----`);
  
  try {
    console.log(`Reading image from: ${imagePath}`);
    const base64Content = await imageToBase64(imagePath);
    console.log(`Image read successfully, Base64 length: ${base64Content.length}`);
    
    // Get MIME type
    const mimeType = await getMimeType(imagePath);
    
    let contentValue;
    if (useDataUrlPrefix) {
      contentValue = `data:${mimeType};base64,${base64Content}`;
    } else {
      contentValue = base64Content;
    }
    
    // Create payload
    const payload = {
      instances: [
        {
          content: contentValue
        }
      ],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      }
    };

    console.log(`Sending request to /api/predict endpoint for ${testName} (${formatName})...`);
    
    const response = await fetch('http://localhost:3003/api/predict', {
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
    console.log(`${testName} (${formatName}) API Response:`, JSON.stringify(result, null, 2));
    console.log(`${testName} (${formatName}) test completed successfully!`);
    return true;
  } catch (error) {
    console.error(`${testName} (${formatName}) test failed:`, error);
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