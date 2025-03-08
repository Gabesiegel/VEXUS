// Script to download sample ultrasound images for testing
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// Configuration
const config = {
    testImagesDir: './test_images',
    // Sample ultrasound images from public sources
    sampleImages: [
        {
            name: 'hepatic_vein_sample1.jpg',
            url: 'https://i.pinimg.com/originals/73/13/aa/7313aa46ddaea8d2dde1fe9e7a19b88d.jpg',
            type: 'hepatic'
        },
        {
            name: 'portal_vein_sample1.jpg',
            url: 'https://assets.aboutkidshealth.ca/AKHAssets/Duplex_ultrasound_EN.jpg',
            type: 'portal'
        },
        {
            name: 'renal_vein_sample1.jpg',
            url: 'https://image.slidesharecdn.com/ultrasoundofrenalvein-150927234909-lva1-app6892/75/ultrasound-of-renal-vein-15-2048.jpg',
            type: 'renal'
        }
    ]
};

// Function to download and save an image
async function downloadImage(url, filePath) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image from ${url}: ${response.status} ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(buffer));
        console.log(`✅ Downloaded image to ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error downloading image from ${url}:`, error);
        return false;
    }
}

// Create fallback test images if download fails (colored squares for each vein type)
async function createFallbackImage(filePath, type) {
    try {
        // Create a simple colored square image
        // This is a base64 encoded 100x100 PNG with different colors per type
        let base64Image;
        
        if (type === 'hepatic') {
            // Red square for hepatic
            base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TtSJVwXYQcchQnSyIFXHUKhShQqgVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi5uak6CIl/i8ptIjx4Lgf7+497t4BQr3MNCswDmh61Uwl4mImuyoGXtGHEAYQRlBmljEnSUl4jq97+Ph6F+NZ3uf+HH1q3mKATySOMt2wiDeIZzYtnfM+cZgVJYX4nHjUoAsSP3JddvmNc9FhgWeGjUxqnjhMLBY7WO5gVjJU4hnisKJqlC9kXVY4b3FWKzXWuid/YTCnrSS5TnMYKSxiCRJEKKiihDJsxGjVSbGQov24j3/Q9UvkUshVAiPHAirQILt+8D/43a2Vn5zwksJxoPPFcT5GgMAu0Kg5zvex4zROgOAzcKW3/JU6MPNJeq2lRY+Avm3g4rqlKXvA5Q4w8GTIpuxKQZpCPg+8n9E3ZYH+W6BnzeutuY/TByBNXSVvgINDYLRA2es+7+5u7+3fM83+fgAOmnK0aflE9wAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB+QDGhEnENGgD8gAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAFklEQVRo3u3BAQ0AAADCoPdPbQ8HFAAA8BjFAAAB8F7+1wAAAABJRU5ErkJggg==';
        } else if (type === 'portal') {
            // Blue square for portal
            base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TtSJVwXYQcchQnSyIFXHUKhShQqgVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi5uak6CIl/i8ptIjx4Lgf7+497t4BQr3MNCswDmh61Uwl4mImuyoGXtGHEAYQRlBmljEnSUl4jq97+Ph6F+NZ3uf+HH1q3mKATySOMt2wiDeIZzYtnfM+cZgVJYX4nHjUoAsSP3JddvmNc9FhgWeGjUxqnjhMLBY7WO5gVjJU4hnisKJqlC9kXVY4b3FWKzXWuid/YTCnrSS5TnMYKSxiCRJEKKiihDJsxGjVSbGQov24j3/Q9UvkUshVAiPHAirQILt+8D/43a2Vn5zwksJxoPPFcT5GgMAu0Kg5zvex4zROgOAzcKW3/JU6MPNJeq2lRY+Avm3g4rqlKXvA5Q4w8GTIpuxKQZpCPg+8n9E3ZYH+W6BnzeutuY/TByBNXSVvgINDYLRA2es+7+5u7+3fM83+fgAOmnK0aflE9wAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB+QDGhErLoXgmdQAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAFklEQVRo3u3BAQ0AAADCoPdPbQ8HFAAA8BjFAAAB8F7+1wAAAABJRU5ErkJggg==';
        } else {
            // Green square for renal
            base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TtSJVwXYQcchQnSyIFXHUKhShQqgVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi5uak6CIl/i8ptIjx4Lgf7+497t4BQr3MNCswDmh61Uwl4mImuyoGXtGHEAYQRlBmljEnSUl4jq97+Ph6F+NZ3uf+HH1q3mKATySOMt2wiDeIZzYtnfM+cZgVJYX4nHjUoAsSP3JddvmNc9FhgWeGjUxqnjhMLBY7WO5gVjJU4hnisKJqlC9kXVY4b3FWKzXWuid/YTCnrSS5TnMYKSxiCRJEKKiihDJsxGjVSbGQov24j3/Q9UvkUshVAiPHAirQILt+8D/43a2Vn5zwksJxoPPFcT5GgMAu0Kg5zvex4zROgOAzcKW3/JU6MPNJeq2lRY+Avm3g4rqlKXvA5Q4w8GTIpuxKQZpCPg+8n9E3ZYH+W6BnzeutuY/TByBNXSVvgINDYLRA2es+7+5u7+3fM83+fgAOmnK0aflE9wAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB+QDGhEsH0aeAfUAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAFklEQVRo3u3BAQ0AAADCoPdPbQ8HFAAA8BjFAAAB8F7+1wAAAABJRU5ErkJggg==';
        }
        
        // Decode base64 and save to file
        const buffer = Buffer.from(base64Image, 'base64');
        await fs.writeFile(filePath, buffer);
        console.log(`✅ Created fallback image for ${type} at ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error creating fallback image:`, error);
        return false;
    }
}

// Main function to download or create test images
async function downloadTestImages() {
    console.log('=== Downloading Test Images ===');
    
    try {
        // Create directory if it doesn't exist
        await fs.mkdir(config.testImagesDir, { recursive: true });
        console.log(`✅ Created test images directory at ${config.testImagesDir}`);
        
        // Download each sample image
        let successCount = 0;
        
        for (const image of config.sampleImages) {
            const filePath = path.join(config.testImagesDir, image.name);
            
            console.log(`Downloading ${image.type} image: ${image.name}`);
            let success = await downloadImage(image.url, filePath);
            
            // If download fails, create a fallback
            if (!success) {
                console.log(`⚠️ Download failed, creating fallback image for ${image.type}`);
                success = await createFallbackImage(filePath, image.type);
            }
            
            if (success) {
                successCount++;
            }
        }
        
        console.log(`\n=== Download Complete ===`);
        console.log(`Successfully created ${successCount} out of ${config.sampleImages.length} test images`);
        
    } catch (error) {
        console.error('Error downloading test images:', error);
    }
}

// Execute download
downloadTestImages(); 