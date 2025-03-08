// Test script for prediction API
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// Configuration
const config = {
    apiUrl: 'http://127.0.0.1:3003/api/predict',
    onDemandEndpointService: "https://endpoints-on-demand-456295042668.us-central1.run.app",
    veinTypes: ['hepatic', 'portal', 'renal'],
    // Better sample test image - grayscale gradient that resembles an ultrasound
    testImageBasic: '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',
    // Path to real test images if available
    testImagesDir: './test_images'
};

// Utility to convert an image file to base64
async function imageFileToBase64(filePath) {
    try {
        const data = await fs.readFile(filePath);
        return data.toString('base64');
    } catch (error) {
        console.error(`Error reading image file ${filePath}:`, error);
        return null;
    }
}

// Test the on-demand service directly first
async function testOnDemandServiceDirectly() {
    console.log('\n=== Testing On-Demand Service Directly ===');
    
    for (const veinType of config.veinTypes) {
        console.log(`\n--- Testing ${veinType} vein endpoint ---`);
        
        try {
            // First ping the endpoint to wake it up
            console.log(`Pinging ${veinType} endpoint...`);
            const pingUrl = `${config.onDemandEndpointService}/ping/${veinType}`;
            
            try {
                const pingResponse = await fetch(pingUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpointId: veinType })
                });
                
                if (pingResponse.ok) {
                    const pingResult = await pingResponse.json();
                    console.log(`Ping response:`, pingResult);
                } else {
                    console.log(`Ping returned ${pingResponse.status}, proceeding with prediction anyway`);
                }
            } catch (pingError) {
                console.error(`Error pinging ${veinType} endpoint:`, pingError.message);
                console.log('Proceeding with prediction anyway');
            }
            
            // Now try prediction with a minimal test image
            console.log(`Testing prediction for ${veinType} endpoint...`);
            
            // Try to load a real test image if available
            let imageContent = config.testImageBasic;
            const testFile = path.join(config.testImagesDir, `${veinType}_vein_sample1.jpg`);
            
            try {
                const fileExists = await fs.access(testFile).then(() => true).catch(() => false);
                if (fileExists) {
                    console.log(`Using real test image from ${testFile}`);
                    imageContent = await imageFileToBase64(testFile);
                }
            } catch (fileError) {
                console.error(`Error checking or loading test file:`, fileError.message);
                console.log('Using basic test image instead');
            }
            
            // Build the prediction request
            const requestBody = {
                instances: [{ content: imageContent }],
                parameters: {
                    confidenceThreshold: 0.0,
                    maxPredictions: 5
                },
                metadata: {
                    veinType: veinType,
                    timestamp: Date.now()
                }
            };
            
            // Make direct request to on-demand service
            const predictUrl = `${config.onDemandEndpointService}/predict/${veinType}`;
            const response = await fetch(predictUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            // Process response
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ On-demand service response status: ${response.status}`);
                
                // Check if we got predictions
                if (result.predictions && result.predictions.length > 0) {
                    const firstPrediction = result.predictions[0];
                    
                    if (firstPrediction.displayNames && firstPrediction.displayNames.length > 0) {
                        console.log(`✅ Received ${firstPrediction.displayNames.length} predictions`);
                        console.log('Top predictions:');
                        
                        for (let i = 0; i < Math.min(3, firstPrediction.displayNames.length); i++) {
                            console.log(`  ${firstPrediction.displayNames[i]}: ${firstPrediction.confidences[i] * 100}%`);
                        }
                    } else {
                        console.log(`⚠️ Received predictions but displayNames array is empty`);
                    }
                } else {
                    console.log(`⚠️ No predictions received from on-demand service`);
                    console.log('Raw response:', JSON.stringify(result, null, 2));
                }
            } else {
                console.log(`❌ On-demand service returned error: ${response.status}`);
                try {
                    const errorText = await response.text();
                    console.log('Error details:', errorText);
                } catch (e) {
                    console.log('Could not parse error details');
                }
            }
            
        } catch (error) {
            console.error(`Error testing ${veinType} endpoint directly:`, error);
        }
    }
}

// Function to test the prediction API with various inputs
async function testPredictionAPI() {
    console.log('=== Starting Prediction API Tests ===');
    
    // First test the on-demand service directly to isolate issues
    await testOnDemandServiceDirectly();
    
    // Test 1: Basic test with minimal test image
    for (const veinType of config.veinTypes) {
        console.log(`\n--- Test 1: Local server prediction test for ${veinType} ---`);
        try {
            const requestBody = {
                instances: [
                    {
                        content: config.testImageBasic
                    }
                ],
                parameters: {
                    confidenceThreshold: 0.0,
                    maxPredictions: 5
                },
                metadata: {
                    veinType: veinType,
                    timestamp: Date.now()
                }
            };
            
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            console.log(`Response for ${veinType}:`, JSON.stringify(result, null, 2));
            
            // Check if we got predictions
            const hasPredictions = result.displayNames && result.displayNames.length > 0;
            console.log(`Has predictions: ${hasPredictions ? 'YES' : 'NO'}`);
            console.log(`Method used: ${result.method || 'unknown'}`);
            
        } catch (error) {
            console.error(`Error testing ${veinType}:`, error);
        }
    }
    
    // Test 2: Try with real test images if available
    try {
        const files = await fs.readdir(config.testImagesDir);
        const imageFiles = files.filter(file => 
            ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase())
        );
        
        if (imageFiles.length > 0) {
            console.log(`\n--- Test 2: Testing with ${imageFiles.length} real images ---`);
            
            for (const imageFile of imageFiles) {
                const filePath = path.join(config.testImagesDir, imageFile);
                const base64Content = await imageFileToBase64(filePath);
                
                if (!base64Content) {
                    console.log(`Skipping ${imageFile} - could not convert to base64`);
                    continue;
                }
                
                console.log(`\nTesting with real image: ${imageFile}`);
                
                // Determine vein type from filename if possible
                let detectedVeinType = 'hepatic'; // default
                const filename = path.basename(imageFile).toLowerCase();
                if (filename.includes('hepatic')) detectedVeinType = 'hepatic';
                if (filename.includes('portal')) detectedVeinType = 'portal';
                if (filename.includes('renal')) detectedVeinType = 'renal';
                
                console.log(`Detected vein type from filename: ${detectedVeinType}`);
                
                try {
                    const requestBody = {
                        instances: [
                            {
                                content: base64Content
                            }
                        ],
                        parameters: {
                            confidenceThreshold: 0.0,
                            maxPredictions: 5
                        },
                        metadata: {
                            veinType: detectedVeinType,
                            imageType: path.extname(imageFile).substring(1),
                            timestamp: Date.now()
                        }
                    };
                    
                    const response = await fetch(config.apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                    
                    const result = await response.json();
                    
                    // Log basic details about the response
                    console.log(`Response status: ${response.status}`);
                    console.log(`Has predictions: ${result.displayNames && result.displayNames.length > 0 ? 'YES' : 'NO'}`);
                    console.log(`Method used: ${result.method || 'unknown'}`);
                    
                    // If we have predictions, log them
                    if (result.displayNames && result.displayNames.length > 0) {
                        const predictions = result.displayNames.map((name, idx) => {
                            return {
                                label: name,
                                confidence: result.confidences[idx]
                            };
                        });
                        console.log('Top predictions:', predictions.slice(0, 3));
                    } else {
                        console.log('No predictions received:', result);
                    }
                    
                } catch (error) {
                    console.error(`Error testing with ${imageFile}:`, error);
                }
            }
        } else {
            console.log('\nNo test images found in the test_images directory');
        }
    } catch (error) {
        console.log(`\nSkipping real image tests: ${error.message}`);
    }
    
    console.log('\n=== Prediction API Tests Complete ===');
}

// Create test_images directory if it doesn't exist
async function ensureTestImagesDir() {
    try {
        await fs.mkdir(config.testImagesDir, { recursive: true });
        console.log(`Test images directory created at ${config.testImagesDir}`);
    } catch (error) {
        console.error('Error creating test images directory:', error);
    }
}

// Execute tests
(async () => {
    try {
        await ensureTestImagesDir();
        await testPredictionAPI();
    } catch (error) {
        console.error('Test execution error:', error);
    }
})(); 