import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test image
const imagePath = path.join(__dirname, 'public', 'test_hepatic.png');

// Read image as base64
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

// Test the server API with both payload formats
async function testServerAPI() {
    console.log('=======================================');
    console.log('TESTING SERVER API ENDPOINT');
    console.log('=======================================');
    console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    
    // First test: Standard format
    await testStandardFormat();
    
    // Second test: b64 format
    await testB64Format();
    
    console.log('=======================================');
    console.log('SERVER API TESTS COMPLETED');
    console.log('=======================================');
}

// Test with standard format (direct base64 string)
async function testStandardFormat() {
    console.log('\n--- Testing with standard format: {content: "base64string"} ---');
    
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
    
    await makeApiRequest(payload, 'standard');
}

// Test with b64 format
async function testB64Format() {
    console.log('\n--- Testing with b64 format: {content: {b64: "base64string"}} ---');
    
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
        }
    };
    
    await makeApiRequest(payload, 'b64');
}

// Make the API request
async function makeApiRequest(payload, formatType) {
    try {
        console.log(`Sending request to server with ${formatType} format...`);
        
        const start = Date.now();
        const response = await fetch('http://localhost:3003/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const elapsed = Date.now() - start;
        
        console.log(`Response time: ${elapsed}ms`);
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Successfully received predictions:');
            
            if (result.displayNames && result.confidences) {
                console.log('Top predictions:');
                result.displayNames.forEach((name, index) => {
                    const confidence = result.confidences[index];
                    console.log(`- ${name}: ${(confidence * 100).toFixed(1)}%`);
                });
            } else {
                console.log('Result structure:', JSON.stringify(result, null, 2));
            }
            
            return true;
        } else {
            let errorText;
            try {
                const errorData = await response.json();
                errorText = JSON.stringify(errorData);
            } catch (e) {
                errorText = await response.text();
            }
            
            console.error(`API error (${formatType} format):`, errorText);
            return false;
        }
    } catch (error) {
        console.error(`Error testing ${formatType} format:`, error.message);
        return false;
    }
}

// Run the tests
testServerAPI(); 