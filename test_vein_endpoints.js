import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use actual ultrasound images for each vein type
const TEST_IMAGES = {
  hepatic: path.join(__dirname, 'public/images/hepatic_long.png'),
  portal: path.join(__dirname, 'public/images/Portal_long_axis.png'),
  renal: path.join(__dirname, 'public/images/Renal_vein_long.png')
};

const API_BASE_URL = 'http://localhost:3002'; // Updated to match server's DEFAULT_PORT

async function testVeinEndpoint(veinType) {
  console.log(`\n------- Testing ${veinType} vein endpoint -------`);
  
  try {
    // Step 1: Read the appropriate test image and convert to base64
    const imagePath = TEST_IMAGES[veinType];
    console.log(`Using test image: ${imagePath}`);
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Step 2: Create the payload with the correct structure
    const payload = {
      instances: [
        {
          content: {
            b64: base64Image
          }
        }
      ],
      parameters: {
        confidenceThreshold: 0.0,
        maxPredictions: 5
      },
      metadata: {
        veinType: veinType,
        imageType: 'image/png', // Assuming PNG, adjust if needed
        timestamp: new Date().toISOString()
      }
    };
    
    console.log(`Sending request to ${veinType} endpoint...`);
    
    // Step 3: Send request to the API
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Step 4: Process the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error with ${veinType} endpoint (${response.status}):`, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log(`✅ ${veinType} endpoint test successful!`);
    console.log(`Top predictions for ${veinType}:`);
    
    if (result.displayNames && result.confidences) {
      result.displayNames.forEach((name, index) => {
        if (index < 3) { // Show top 3 predictions
          console.log(`  - ${name}: ${(result.confidences[index] * 100).toFixed(2)}%`);
        }
      });
    } else {
      console.log('Unexpected response format:', result);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error testing ${veinType} endpoint:`, error.message);
    return false;
  }
}

async function testAllEndpoints() {
  console.log('=================================================');
  console.log('  VExUS ATLAS - Endpoint Testing');
  console.log('=================================================');
  
  // First check if server is running
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      console.error('❌ Server health check failed. Is your server running?');
      return;
    }
    
    const healthData = await healthCheck.json();
    console.log('✅ Server is running');
    console.log(`Server info: ${JSON.stringify(healthData, null, 2)}`);
    console.log('=================================================');
  } catch (error) {
    console.error('❌ Cannot connect to server. Please make sure your server is running.');
    console.error(`Error: ${error.message}`);
    return;
  }
  
  // Test each vein type
  const results = {
    hepatic: await testVeinEndpoint('hepatic'),
    portal: await testVeinEndpoint('portal'),
    renal: await testVeinEndpoint('renal')
  };
  
  // Summary
  console.log('\n=================================================');
  console.log('  SUMMARY');
  console.log('=================================================');
  console.log(`Hepatic Vein: ${results.hepatic ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Portal Vein:  ${results.portal ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Renal Vein:   ${results.renal ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('=================================================');
}

// Run the tests
testAllEndpoints();
