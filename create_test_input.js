const fs = require('fs');
const path = require('path');

// Path to the test image
const imagePath = path.join(__dirname, 'public', 'test_upload.jpeg');

try {
  // Read the image file
  const imageBuffer = fs.readFileSync(imagePath);
  
  // Convert to base64
  const base64Image = imageBuffer.toString('base64');
  
  console.log(`Image size: ${imageBuffer.length} bytes`);
  console.log(`Base64 length: ${base64Image.length} characters`);
  console.log(`Base64 preview: ${base64Image.substring(0, 50)}...`);
  
  // Create input payload
  const payload = {
    instances: [
      {
        content: base64Image,
        mimeType: "image/jpeg"
      }
    ],
    parameters: {
      confidenceThreshold: 0.5,
      maxPredictions: 5
    }
  };
  
  // Write to input.json
  fs.writeFileSync('input.json', JSON.stringify(payload, null, 2));
  
  console.log('Successfully created input.json with valid test image');
  
} catch (error) {
  console.error('Error:', error);
} 