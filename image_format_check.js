import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test image
const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');

async function analyzeImageFormat() {
    console.log('Analyzing image format for Vertex AI compatibility...');
    console.log(`Image path: ${imagePath}`);
    
    try {
        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found at: ${imagePath}`);
        }
        
        // Get file stats
        const stats = fs.statSync(imagePath);
        console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
        
        // Read image as buffer
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Check magic numbers for image format
        let format = 'unknown';
        if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47) {
            format = 'PNG';
        } else if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
            format = 'JPEG';
        }
        console.log(`Detected format: ${format}`);
        
        // Convert to base64
        const base64Image = imageBuffer.toString('base64');
        console.log(`Base64 length: ${base64Image.length} characters`);
        
        // Log first few bytes of base64 (for debugging)
        console.log(`Base64 start: ${base64Image.substring(0, 50)}...`);
        
        // Create sample payload for Vertex AI
        const payload = {
            instances: [
                {
                    content: base64Image
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        // Write the payload to file for inspection (without the full base64 for readability)
        const samplePayload = {
            ...payload,
            instances: [
                {
                    content: `${base64Image.substring(0, 50)}... (truncated)`
                }
            ]
        };
        
        console.log('Sample payload structure:');
        console.log(JSON.stringify(samplePayload, null, 2));
        
        // Check for any unusual characters in base64 that might cause issues
        const validBase64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
        const isValidBase64 = validBase64Regex.test(base64Image);
        console.log(`Base64 validation: ${isValidBase64 ? 'Valid' : 'Invalid - may contain unusual characters'}`);
        
    } catch (error) {
        console.error('Error analyzing image:', error);
    }
}

// Run the analysis
analyzeImageFormat(); 