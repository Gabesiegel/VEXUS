import fetch from 'node-fetch';
import fs from 'fs/promises';

// Load a test image
async function loadTestImage() {
  try {
    // Try to load the test image from the test_payload.json file
    const payload = JSON.parse(await fs.readFile('./test_payload.json', 'utf8'));
    return payload.instances[0].content;
  } catch (error) {
    console.error('Error loading test image:', error);
    // Return a minimal base64 image if we can't load the test image
    return '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKACiiigAooooA//Z';
  }
}

async function testServerFormat() {
  try {
    console.log('Testing server format...');
    
    // Load the test image
    const imageContent = await loadTestImage();
    console.log(`Loaded test image (${imageContent.length} characters)`);
    
    // Create the request payload - make sure to use the format expected by the server
    const payload = {
      image: imageContent,  // Changed from imageData to image
      veinType: 'hepatic',
      metadata: {
        source: 'test_script',
        timestamp: Date.now()
      }
    };
    
    // Make the request to the server
    console.log('Sending request to server...');
    const response = await fetch('http://localhost:3002/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Check the response
    const statusCode = response.status;
    console.log(`Server responded with status code: ${statusCode}`);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('Error parsing response as JSON:', error);
      console.log('Response text:', text);
      return;
    }
    
    // Log the response
    if (statusCode === 200) {
      console.log('Server response:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('Server error:', responseData);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testServerFormat(); 