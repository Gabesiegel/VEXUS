import fetch from 'node-fetch';
import fs from 'fs/promises';

// Function to create a smaller test image (1x1 pixel black PNG)
async function createTestImage(outputPath) {
  // Very small black PNG (1x1 pixel)
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFLQI0QSlO/QAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64Png, 'base64');
  await fs.writeFile(outputPath, buffer);
  return base64Png;
}

// Test the endpoint with a minimal image
async function testEndpoint() {
  try {
    console.log("Creating test image...");
    const outputPath = './test_minimal.png';
    const base64Content = await createTestImage(outputPath);
    
    console.log("Testing /api/predict endpoint with minimal image...");
    
    // Create payload
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
    
    // Send request
    const response = await fetch('http://localhost:3003/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} - ${errorText}`);
      return;
    }
    
    const result = await response.json();
    console.log("API Response:", JSON.stringify(result, null, 2));
    console.log("Test successful!");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testEndpoint(); 