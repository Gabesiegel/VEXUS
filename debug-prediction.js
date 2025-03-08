#!/usr/bin/env node

/**
 * Debug script for VExUS on-demand endpoint service
 * This script isolates the issue with the on-demand service by trying different payload formats
 */

import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
 * Load an image file and return its buffer
 */
async function loadImageFile(filePath) {
    console.log(`Loading image file: ${filePath}`);
    const imageBuffer = await fs.readFile(filePath);
    const extension = path.extname(filePath).substring(1);
    
    return {
        buffer: imageBuffer,
        contentType: `image/${extension}`,
        filename: path.basename(filePath)
    };
}

/**
 * Call the on-demand endpoint service with different payload formats
 */
async function debugOnDemandService(imageInfo, veinType = "hepatic") {
    try {
        console.log(`\nDebugging on-demand endpoint service for ${veinType}...`);
        
        // Convert image to base64 string
        const base64Image = imageInfo.buffer.toString('base64');
        
        // Create different payload formats to test
        const payloads = [
            {
                name: "Simple string content",
                body: {
                    instances: [
                        { content: base64Image }
                    ]
                }
            },
            {
                name: "JSON content",
                body: {
                    instances: [
                        { 
                            b64ImageBytes: base64Image,
                            key: "image"
                        }
                    ]
                }
            },
            {
                name: "Structured content",
                body: {
                    instances: [
                        { 
                            image: { 
                                b64ImageBytes: base64Image 
                            }
                        }
                    ]
                }
            },
            {
                name: "Data URI format",
                body: {
                    instances: [
                        { 
                            content: `data:${imageInfo.contentType};base64,${base64Image}`
                        }
                    ]
                }
            }
        ];
        
        // Try each payload format
        for (const payload of payloads) {
            console.log(`\nTrying format: ${payload.name}`);
            
            // Log the payload structure (without the full base64 data)
            const debugPayload = JSON.parse(JSON.stringify(payload.body));
            if (debugPayload.instances && debugPayload.instances[0]) {
                const instance = debugPayload.instances[0];
                if (instance.content && typeof instance.content === 'string') {
                    instance.content = `[Base64 string (${base64Image.length} chars)]`;
                }
                if (instance.b64ImageBytes) {
                    instance.b64ImageBytes = `[Base64 string (${base64Image.length} chars)]`;
                }
                if (instance.image && instance.image.b64ImageBytes) {
                    instance.image.b64ImageBytes = `[Base64 string (${base64Image.length} chars)]`;
                }
            }
            console.log("Request payload structure:", JSON.stringify(debugPayload, null, 2));
            
            try {
                const url = `${CONFIG.onDemandService}/predict/${veinType}`;
                console.log(`Sending request to: ${url}`);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload.body)
                });
                
                const status = response.status;
                let data;
                
                try {
                    data = await response.json();
                } catch (e) {
                    console.log(`Error parsing response as JSON: ${e.message}`);
                    const text = await response.text();
                    console.log(`Raw response: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
                    continue;
                }
                
                console.log(`Response (${status}):`);
                console.log(JSON.stringify(data, null, 2));
                
                if (status === 200) {
                    console.log(`SUCCESS with format: ${payload.name}`);
                    return { success: true, data, format: payload.name };
                } else {
                    console.log(`FAILED with format: ${payload.name} - Status ${status}: ${data.error || JSON.stringify(data)}`);
                }
            } catch (error) {
                console.error(`Network error with format ${payload.name}:`, error.message);
            }
        }
        
        // If we get here, all formats failed
        console.log("All formats failed. The on-demand service may need to be updated.");
        return { success: false };
        
    } catch (error) {
        console.error("Unhandled error:", error.message);
        return { success: false, error };
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log("=== VExUS On-Demand Service Debug ===\n");
        
        // Test image
        const imagePath = path.join(__dirname, 'public', 'images', 'hepatic_long.png');
        
        // Check if file exists
        try {
            await fs.access(imagePath);
        } catch (error) {
            console.error(`Image file does not exist: ${imagePath}`);
            return;
        }
        
        // Load the image
        const imageInfo = await loadImageFile(imagePath);
        console.log(`Loaded image: ${imageInfo.filename} (${imageInfo.buffer.length} bytes)`);
        
        // Debug the on-demand service
        const result = await debugOnDemandService(imageInfo);
        
        if (result.success) {
            console.log(`\nSUCCESS: Found working format for on-demand service: ${result.format}`);
        } else {
            console.log(`\nFAILED: No working format found for on-demand service.`);
            console.log("The on-demand service implementation in endpoints-on-demand/main.py may need to be updated");
            console.log("Check the get_prediction function and how it handles the instances format.");
        }
        
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main(); 