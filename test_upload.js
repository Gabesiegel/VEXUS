import fetch from 'node-fetch';
import fs from 'fs/promises';

async function testImageUpload() {
    try {
        // Read the image file
        const imageBuffer = await fs.readFile('public/test_image.png');
        const base64Image = imageBuffer.toString('base64');
        
        const payload = {
            instances: [{
                content: `data:image/png;base64,${base64Image}`
            }],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };

        console.log('Sending request to server...');
        const response = await fetch('http://localhost:3003/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testImageUpload();
