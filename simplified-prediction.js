#!/usr/bin/env node

/**
 * Simplified prediction application for VExUS
 * This script does the following:
 * 1. Takes a sample ultrasound image from public/images/
 * 2. Uploads it to Google Cloud Storage
 * 3. Calls the on-demand endpoint service
 */

import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { optimizeImageFile, getOptimizedBase64 } from './image-optimizer.js';

// Configuration
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    location: "us-central1",
    bucketName: "vexus-ai-images-plucky-weaver-450819-k7-20250223131511",
    onDemandService: "https://endpoints-on-demand-456295042668.us-central1.run.app"
};

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Storage
const storage = new Storage();
const bucket = storage.bucket(CONFIG.bucketName);

/**
 * Upload an image file to GCS
 */
async function uploadImageFile(filePath) {
    try {
        // Read the file and optimize it
        console.log(`Reading and optimizing ${filePath}...`);
        const optimizedImage = await optimizeImageFile(filePath, {
            maxWidth: 1024,  // Resize to max 1024px width
            quality: 85      // Good quality with reasonable compression
        });
        
        // Determine file extension
        const extension = optimizedImage.format || path.extname(filePath).substring(1);
        const timestamp = Date.now();
        const filename = `test_image_${timestamp}.${extension}`;
        
        // Upload to GCS
        console.log(`Uploading optimized image (${(optimizedImage.buffer.length/1024).toFixed(2)}KB) to GCS as ${filename}...`);
        const file = bucket.file(`images/${filename}`);
        
        await file.save(optimizedImage.buffer);
        
        // Get the GCS URI
        const gcsUri = `gs://${CONFIG.bucketName}/images/${filename}`;
        console.log(`Image uploaded successfully: ${gcsUri}`);
        
        return {
            gcsUri,
            filename,
            contentType: optimizedImage.contentType || `image/${extension}`,
            buffer: optimizedImage.buffer,
            originalSize: optimizedImage.originalSize,
            optimizedSize: optimizedImage.optimizedSize,
            compressionRatio: optimizedImage.compressionRatio
        };
    } catch (error) {
        console.error("Error uploading image:", error);
        
        // Fallback to original method if optimization fails
        console.log("Falling back to unoptimized image upload...");
        const imageBuffer = await fs.readFile(filePath);
        
        const extension = path.extname(filePath).substring(1);
        const timestamp = Date.now();
        const filename = `test_image_${timestamp}.${extension}`;
        
        console.log(`Uploading original image to GCS as ${filename}...`);
        const file = bucket.file(`images/${filename}`);
        
        await file.save(imageBuffer);
        
        const gcsUri = `gs://${CONFIG.bucketName}/images/${filename}`;
        console.log(`Image uploaded successfully: ${gcsUri}`);
        
        return {
            gcsUri,
            filename,
            contentType: `image/${extension}`,
            buffer: imageBuffer
        };
    }
}

/**
 * Get authentication token for Google Cloud
 */
async function getAuthToken() {
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    return token;
}

/**
 * Make a direct prediction call to Vertex AI
 */
async function makeDirectPrediction(imageInfo, veinType = "hepatic") {
    try {
        // Get auth token
        const token = await getAuthToken();
        
        // Vertex AI endpoint ID for the specified vein type
        let endpointId;
        switch (veinType.toLowerCase()) {
            case "hepatic":
                endpointId = "8159951878260523008";
                break;
            case "portal":
                endpointId = "2970410926785691648";
                break;
            case "renal":
                endpointId = "1148704877514326016";
                break;
            default:
                throw new Error(`Unsupported vein type: ${veinType}`);
        }
        
        // Endpoint URL
        const url = `https://${CONFIG.location}-aiplatform.googleapis.com/v1/projects/${CONFIG.projectId}/locations/${CONFIG.location}/endpoints/${endpointId}:predict`;
        
        // Convert image to base64
        const base64Image = imageInfo.buffer.toString('base64');
        
        // Use the format that works reliably
        console.log(`\nMaking direct Vertex AI prediction using Base64 content format...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [{ content: base64Image }]
            })
        });
        
        const status = response.status;
        const data = await response.json();
        
        console.log(`Response (${status}):`);
        console.log(JSON.stringify(data, null, 2));
        
        if (status === 200) {
            console.log(`SUCCESS with Base64 content format`);
            return { success: true, data, format: "Base64 content" };
        } else {
            console.log(`FAILED - Status ${status}: ${data.error?.message || JSON.stringify(data)}`);
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error("Error in direct prediction:", error.message);
        return { success: false, error };
    }
}

/**
 * Call the on-demand endpoint service
 */
async function callOnDemandService(imageInfo, veinType = "hepatic") {
    try {
        console.log(`\nTrying on-demand endpoint service for ${veinType}...`);
        
        // Convert image to base64
        const base64Image = imageInfo.buffer.toString('base64');
        
        // Log optimization metrics if available
        if (imageInfo.compressionRatio) {
            console.log(`Image optimization: ${(imageInfo.originalSize/1024).toFixed(2)}KB → ${(imageInfo.optimizedSize/1024).toFixed(2)}KB (${imageInfo.compressionRatio.toFixed(2)}x smaller)`);
        }
        
        // The image might be too large, let's implement a size check
        console.log(`Base64 image size: ${base64Image.length} characters (${(base64Image.length/1024/1024).toFixed(2)} MB)`);
        
        if (base64Image.length > 1000000) {
            console.log("WARNING: Image is quite large (>1MB encoded). This might cause timeouts or errors.");
            console.log("Consider using a smaller image or implementing image compression.");
        }
        
        // Use the same format that works with direct Vertex AI
        const payload = {
            instances: [{ content: base64Image }]
        };
        
        console.log(`Request payload structure: { instances: [{ content: "[Base64 data]" }] }`);
        
        // Make the request to the on-demand service
        const url = `${CONFIG.onDemandService}/predict/${veinType}`;
        console.log(`Sending request to: ${url}`);
        
        // Set a longer timeout for the fetch request (90 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        
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
            
            const status = response.status;
            let data;
            
            try {
                const text = await response.text();
                console.log(`Raw response (first 500 chars): ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
                
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.log(`Error parsing response as JSON: ${parseError.message}`);
                    return { success: false, error: parseError };
                }
            } catch (e) {
                console.log(`Error reading response: ${e.message}`);
                return { success: false, error: e };
            }
            
            console.log(`Response status: ${status}`);
            if (data) {
                console.log(`Response data:`, JSON.stringify(data, null, 2));
            }
            
            if (status === 200) {
                console.log(`SUCCESS with on-demand service`);
                return { success: true, data, format: "Base64 content" };
            } else {
                console.log(`FAILED - Status ${status}: ${data?.error || JSON.stringify(data)}`);
                
                // Add detailed debugging suggestions
                console.log("\nDebugging suggestions:");
                console.log("1. Check if the on-demand service is properly handling the Base64 encoded data");
                console.log("2. Check the Cloud Run logs for more detailed error information");
                console.log("3. Consider using a smaller test image to reduce payload size");
                
                return { success: false, error: data?.error };
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error('The request timed out after 90 seconds');
            } else {
                console.error(`Network error with on-demand service:`, fetchError.message);
            }
            return { success: false, error: fetchError };
        }
    } catch (error) {
        console.error("Error calling on-demand service:", error.message);
        return { success: false, error };
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log("=== Simplified VExUS Prediction Test ===\n");
        
        // List of images to try
        const imagePaths = [
            path.join(__dirname, 'public', 'images', 'hepatic_long.png'),
            path.join(__dirname, 'public', 'images', 'image_gallery', 'Hepatic', 'Normal', '01.02.4.HV.NL.png')
        ];
        
        // Try each image
        for (const imagePath of imagePaths) {
            console.log(`\nTesting with image: ${imagePath}`);
            
            // Check if the file exists
            try {
                await fs.access(imagePath);
            } catch (error) {
                console.log(`Image file does not exist: ${imagePath}`);
                continue;
            }
            
            // Upload the image to GCS
            const imageInfo = await uploadImageFile(imagePath);
            
            // Try direct Vertex AI prediction
            const directResult = await makeDirectPrediction(imageInfo);
            
            // Try on-demand endpoint service
            const onDemandResult = await callOnDemandService(imageInfo);
            
            // Summary for this image
            console.log("\n=== Results ===");
            console.log(`Direct Vertex AI: ${directResult.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`On-demand Service: ${onDemandResult.success ? 'SUCCESS' : 'FAILED'}`);
            
            // If both failed, clean up and continue
            if (!directResult.success && !onDemandResult.success) {
                console.log("Both approaches failed. Cleaning up and trying next image...");
                // Cleanup: Delete the uploaded image if needed
                continue;
            }
            
            // If we found a working approach, exit with success
            if (directResult.success) {
                console.log(`\nFOUND WORKING FORMAT for Direct Vertex AI: ${directResult.format}`);
                return;
            }
            
            if (onDemandResult.success) {
                console.log(`\nFOUND WORKING FORMAT for On-demand Service: ${onDemandResult.format}`);
                return;
            }
        }
        
        console.log("\nNo working format found for any image. Please check the model and endpoint configuration.");
        
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main(); 