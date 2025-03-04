import fetch from 'node-fetch';
import fs from 'fs/promises';

async function testEndpoint(veinType, base64Image) {
  try {
    const payload = {
      instances: [{ content: base64Image }],
      parameters: { confidenceThreshold: 0.0, maxPredictions: 5 },
    };

    const response = await fetch(`/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      let errorDetails = {};
      try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || {};
      } catch (e) {
          // If parsing fails, use status code
      }
      console.error(`Error testing ${veinType} endpoint:`, errorMessage, errorDetails);
      return { success: false, veinType, errorMessage, errorDetails };
    }

    const result = await response.json();
    console.log(`Result for ${veinType}:`, result);
    return { success: true, veinType, result };

  } catch (error) {
    console.error(`Error testing ${veinType} endpoint:`, error);
    return { success: false, veinType, errorMessage: error.message || 'Unknown error', errorDetails: error.details || {} };
  }
}

async function runTests() {
  try {
    // Use a simple 1x1 black pixel PNG image for testing
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    const results = [];
    results.push(await testEndpoint('hepatic', base64Image));
    results.push(await testEndpoint('portal', base64Image));
    results.push(await testEndpoint('renal', base64Image));

    console.log('\n--- Test Results ---');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.veinType}: Success`);
      } else {
        console.log(`❌ ${result.veinType}: Failed - ${result.errorMessage}`);
        if (result.errorDetails) {
            console.log(`   Details:`, result.errorDetails)
        }
      }
    });

  } catch (error) {
    console.error('Error during tests:', error);
  }
}

runTests();
