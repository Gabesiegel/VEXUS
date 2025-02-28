import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// Map vein types to appropriate test images
const TEST_IMAGES = {
  hepatic: 'public/images/hepatic_long.png',
  portal: 'public/images/Portal_long_axis.png',
  renal: 'public/images/Renal_vein_long.png'
};

async function main() {
  try {
    console.log('VExUS API Endpoint Test');
    console.log('=======================');
    
    // The vein types to test
    const veinTypes = ['hepatic', 'portal', 'renal'];
    
    // Test each endpoint
    for (const veinType of veinTypes) {
      console.log(`\nTesting ${veinType} vein endpoint...`);
      
      // Read test image for this vein type
      let imageBase64;
      try {
        const imagePath = TEST_IMAGES[veinType];
        const imageBuffer = await fs.readFile(imagePath);
        imageBase64 = imageBuffer.toString('base64');
        console.log(`Test image loaded: ${imagePath}`);
      } catch (err) {
        console.error(`Error loading test image: ${err.message}`);
        console.log('Using minimal base64 data for testing');
        imageBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent GIF
      }
      
      const payload = {
        instances: [
          {
            content: {
              b64: imageBase64
            }
          }
        ],
        parameters: {
          confidenceThreshold: 0.0,
          maxPredictions: 5
        },
        metadata: {
          veinType: veinType,
          imageType: 'image/png',
          timestamp: Date.now()
        }
      };
      
      try {
        console.log(`Sending request to ${veinType} endpoint...`);
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:3002/api/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`  ❌ ${veinType} endpoint error: ${response.status} ${response.statusText}`);
          console.error(`     Details: ${errorText}`);
          continue;
        }
        
        const result = await response.json();
        
        // Check if we have predictions
        if (result.displayNames && result.displayNames.length > 0) {
          console.log(`  ✅ ${veinType} endpoint responded successfully in ${elapsedTime}s`);
          console.log(`  📊 Top predictions:`);
          
          // Display all predictions
          result.displayNames.forEach((name, i) => {
            if (result.confidences[i]) {
              console.log(`     - ${name}: ${(result.confidences[i] * 100).toFixed(1)}%`);
            }
          });
          
          console.log(`  🔍 Model ID: ${result.modelId || 'N/A'}`);
        } else {
          console.log(`  ⚠️ ${veinType} endpoint responded but returned no predictions`);
        }
        
        // Check if storage worked
        if (result.storage && result.storage.stored) {
          console.log(`  💾 Image saved: ${result.storage.imageUrl}`);
        } else {
          console.log(`  ℹ️ Image not stored`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error testing ${veinType} endpoint:`, error.message);
      }
    }
    
    console.log('\nAll endpoint tests completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main(); 