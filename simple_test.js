import fs from 'fs/promises';

async function testUpload() {
    try {
        // Read image file
        const imageBuffer = await fs.readFile('public/test_image.png');
        const base64Image = imageBuffer.toString('base64');
        
        // Log file size and first few characters of base64
        console.log('Image size:', imageBuffer.length, 'bytes');
        console.log('Base64 preview:', base64Image.substring(0, 50) + '...');
        
        // Write base64 to file for verification
        await fs.writeFile('image_base64.txt', base64Image);
        console.log('Base64 data written to image_base64.txt for verification');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testUpload();
