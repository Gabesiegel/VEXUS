import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    apiUrl: 'http://127.0.0.1:3002/api/predict',
    veinTypes: ['hepatic', 'portal', 'renal'],
    testImagesDir: './test_images'
};

/**
 * Convert an image file to a base64 data URL
 * @param {string} filePath - Path to the image file
 * @returns {Promise<string>} - Base64 data URL
 */
async function imageFileToDataURL(filePath) {
    try {
        const imageBuffer = await fs.readFile(filePath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
        console.error(`Error converting image to base64: ${error.message}`);
        throw error;
    }
}

/**
 * Process a base64 data URL to the format expected by Vertex AI
 * @param {string} dataUrl - Base64 data URL
 * @returns {Object} - Processed image data with content and mime type
 */
function processDataUrl(dataUrl) {
    console.log('Processing data URL to extract base64 content and MIME type');
    
    // Extract the actual base64 content and mime type
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
        throw new Error('Invalid base64 data format');
    }
    
    const base64Content = parts[1];
    const mimeTypeMatch = parts[0].match(/:(.*?);/);
    if (!mimeTypeMatch) {
        throw new Error('Could not determine image mime type');
    }
    const mimeType = mimeTypeMatch[1];
    
    return {
        content: base64Content,
        mimeType: mimeType
    };
}

/**
 * Test the prediction API with an image in the proper format
 * @param {string} veinType - Type of vein (hepatic, portal, renal)
 * @param {string} imagePath - Path to the image file
 */
async function testPrediction(veinType, imagePath) {
    try {
        console.log(`\n----- Testing prediction for ${veinType} vein with image: ${imagePath} -----`);
        
        // Convert image to data URL
        const dataUrl = await imageFileToDataURL(imagePath);
        
        // Process data URL to extract content and MIME type
        const processedImage = processDataUrl(dataUrl);
        
        // Create the payload in the proper format
        const payload = {
            instances: [
                {
                    content: processedImage.content
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            },
            metadata: {
                veinType: veinType,
                imageType: processedImage.mimeType,
                timestamp: Date.now()
            }
        };
        
        console.log(`Sending prediction request for ${veinType} vein...`);
        
        // Send the request
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        // Process the response
        const responseData = await response.json();
        
        if (!response.ok) {
            console.error(`\n❌ Prediction failed with status ${response.status}: ${response.statusText}`);
            console.error(`Error details: ${responseData.error || 'Unknown error'}`);
            
            if (responseData.details) {
                console.error(`Additional information: ${responseData.details}`);
            }
            
            return { success: false, error: responseData.error, status: response.status, details: responseData };
        }
        
        console.log(`\n✅ Prediction successful for ${veinType} vein`);
        console.log('Top predictions:');
        
        if (responseData.displayNames && responseData.confidences) {
            const predictions = responseData.displayNames.map((name, i) => ({
                class: name,
                confidence: responseData.confidences[i]
            })).sort((a, b) => b.confidence - a.confidence);
            
            predictions.slice(0, 3).forEach((pred, i) => {
                console.log(`  ${i + 1}. ${pred.class}: ${(pred.confidence * 100).toFixed(2)}%`);
            });
        } else {
            console.log('No predictions returned in the response');
        }
        
        console.log(`Method used: ${responseData.method || 'unknown'}`);
        
        return { success: true, result: responseData };
    } catch (error) {
        console.error(`\n❌ Error testing prediction for ${veinType}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Run all prediction tests for all vein types
 */
async function runAllTests() {
    console.log('Starting prediction tests with proper image format');
    
    // Test each vein type with its sample image
    for (const veinType of CONFIG.veinTypes) {
        const imagePath = path.join(CONFIG.testImagesDir, `${veinType}_vein_sample1.jpg`);
        
        try {
            await fs.access(imagePath);
            await testPrediction(veinType, imagePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`Test image not found: ${imagePath}`);
            } else {
                console.error(`Error accessing test image: ${error.message}`);
            }
        }
    }
    
    console.log('\nAll prediction tests completed');
}

// Run the tests
runAllTests().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
}); 