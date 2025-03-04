import fs from 'fs/promises';

async function createAndSaveBase64Image() {
  try {
    // Create a 1x1 black pixel image (PNG format)
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    // Log base64
    console.log('Base64 image:', base64Image);

    // Write base64 to file for verification
    await fs.writeFile('test_minimal.png', Buffer.from(base64Image, 'base64'));
    console.log('Base64 data written to test_minimal.png for verification');

  } catch (error) {
    console.error('Error:', error);
  }
}

createAndSaveBase64Image();
