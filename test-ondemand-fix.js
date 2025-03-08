#!/usr/bin/env node

/**
 * Minimal test script for VExUS on-demand service
 * This script uses a small test image and the correct JSON format
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const CONFIG = {
    onDemandService: "https://endpoints-on-demand-456295042668.us-central1.run.app"
};

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test the on-demand service with a specific vein type
 */
async function testOnDemandService(imageFilePath, veinType = "hepatic") {
    try {
        console.log(`\nTesting on-demand service for ${veinType} with ${path.basename(imageFilePath)}...`);
        
        // Read the image file
        console.log(`Reading image file: ${imageFilePath}`);
        const imageBuffer = await fs.readFile(imageFilePath);
        
        // Convert to base64
        const base64Image = imageBuffer.toString('base64');
        console.log(`Image size: ${imageBuffer.length} bytes (${(base64Image.length/1024/1024).toFixed(2)} MB base64)`);
        
        // Construct the payload with the correct format
        const payload = {
            instances: [
                {
                    content: base64Image
                }
            ]
        };
        
        // Make request to the on-demand service
        const url = `${CONFIG.onDemandService}/predict/${veinType}`;
        console.log(`Sending request to: ${url}`);
        
        // Set a timeout for the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`Response status: ${response.status} ${response.statusText}`);
            
            // Get the response text
            const responseText = await response.text();
            
            // Try to parse as JSON, but show the text if it fails
            try {
                const data = JSON.parse(responseText);
                console.log("Response data:", JSON.stringify(data, null, 2));
                
                if (response.status === 200) {
                    console.log("\n✅ SUCCESS! The on-demand service is working correctly.");
                    return true;
                } else {
                    console.log("\n❌ FAILED with status code:", response.status);
                    return false;
                }
            } catch (parseError) {
                console.log(`Error parsing response as JSON: ${parseError.message}`);
                console.log("Raw response:", responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : ''));
                return false;
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error('\n❌ The request timed out after 2 minutes');
            } else {
                console.error('\n❌ Network error:', fetchError.message);
            }
            return false;
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    console.log("=== VExUS On-Demand Service Test ===");
    
    // Try a small test image first
    let smallImagePath;
    
    // Try to find a small image from different possible locations
    const potentialImages = [
        path.join(__dirname, 'public', 'images', 'image_gallery', 'Hepatic', 'Normal', '01.02.4.HV.NL.png'),
        path.join(__dirname, 'public', 'images', 'logo.png'),
        path.join(__dirname, 'public', 'images', 'hepatic_small.png')
    ];
    
    for (const imgPath of potentialImages) {
        try {
            await fs.access(imgPath);
            smallImagePath = imgPath;
            break;
        } catch (err) {
            // File doesn't exist, try next one
        }
    }
    
    if (!smallImagePath) {
        console.error("Could not find a small test image. Please specify a valid path.");
        return;
    }
    
    console.log(`Using test image: ${smallImagePath}`);
    
    // Test with different vein types
    const veinTypes = ["hepatic", "portal", "renal"];
    
    for (const veinType of veinTypes) {
        const success = await testOnDemandService(smallImagePath, veinType);
        console.log(`\nResults for ${veinType}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
}); 