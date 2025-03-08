// Direct test of Vertex AI endpoint
import fs from 'fs/promises';
import path from 'path';
import { v1 } from '@google-cloud/aiplatform';
import { GoogleAuth } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Configuration
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
        hepatic: "8159951878260523008",  // VExUS - Hepatic Vein
        portal: "2970410926785691648",    // VExUS - Portal Vein
        renal: "1148704877514326016"      // VExUS - Renal Vein
    },
    // Test images directory
    testImagesDir: './test_images'
};

// Initialize Secret Manager client
const secretManagerClient = new SecretManagerServiceClient();

// Utility to convert an image file to base64
async function imageFileToBase64(filePath) {
    try {
        const data = await fs.readFile(filePath);
        return data.toString('base64');
    } catch (error) {
        console.error(`Error reading image file ${filePath}:`, error);
        return null;
    }
}

// Get credentials from Secret Manager
async function getCredentials() {
    try {
        const secretName = `projects/${CONFIG.projectId}/secrets/KEY/versions/latest`;
        console.log('Getting credentials from Secret Manager:', secretName);
        const [version] = await secretManagerClient.accessSecretVersion({ name: secretName });
        return JSON.parse(version.payload.data.toString());
    } catch (error) {
        console.error('Failed to get credentials from Secret Manager:', error);
        throw error;
    }
}

// Initialize Vertex AI client
async function initializeVertexAI() {
    try {
        console.log('Getting credentials from Secret Manager...');
        const credentials = await getCredentials();

        console.log('Initializing Vertex AI client with Secret Manager credentials');
        const apiEndpoint = `${CONFIG.location}-aiplatform.googleapis.com`;
        
        console.log(`Using Vertex AI API endpoint: ${apiEndpoint}`);
        
        const predictionClient = new v1.PredictionServiceClient({
            apiEndpoint: apiEndpoint,
            credentials: credentials
        });
        
        return predictionClient;
    } catch (error) {
        console.error('Failed to initialize Vertex AI client:', error);
        throw error;
    }
}

// Test all vein types with real images
async function testAllVeinTypes() {
    try {
        console.log('=== Testing Direct Vertex AI Endpoints ===');
        
        // Initialize the Vertex AI client
        const predictionClient = await initializeVertexAI();
        console.log('✅ Successfully initialized Vertex AI client');
        
        // Get list of test images
        let imageFiles;
        try {
            const files = await fs.readdir(CONFIG.testImagesDir);
            imageFiles = files.filter(file => 
                ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase())
            );
            console.log(`Found ${imageFiles.length} test images`);
        } catch (error) {
            console.error('Error reading test images directory:', error);
            imageFiles = [];
        }
        
        // Test each vein type
        for (const [veinType, endpointId] of Object.entries(CONFIG.endpointIds)) {
            console.log(`\n--- Testing ${veinType} vein endpoint ---`);
            
            // Find a matching test image for this vein type
            const matchingImages = imageFiles.filter(file => 
                file.toLowerCase().includes(veinType.toLowerCase())
            );
            
            let imageContent;
            if (matchingImages.length > 0) {
                const imagePath = path.join(CONFIG.testImagesDir, matchingImages[0]);
                console.log(`Using test image: ${imagePath}`);
                imageContent = await imageFileToBase64(imagePath);
            } else {
                console.log('No matching test image found, using grayscale gradient image');
                // Use a grayscale gradient as fallback
                imageContent = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCABkAGQDASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAQIDBAAF/8QAFwEBAQEBAAAAAAAAAAAAAAAAAAECA//aAAwDAQACEAMQAAAB+onVMXK/VZcl5rPXmb4HiqdHNWRRHLfJc1bgtx8l0vCnXHDQNmzHPQ5ZPNNGOk9rFBUqfPPb8vVy3VNmrJWgaM8aw28Yrj2I3SoNs43StNfDx7WNWL0M7nLSzrZ5Ft83ZYJAFMaQDHBBU+VfQ8PcwJUi2HUVKkWSc0kBSQs6CaAo7lVJAmxSDXKA6TknTKyhBALAhBUlmAMAMB//xAAgEAACAgMAAwEBAQAAAAAAAAAAAQIRAxIhIjEQMkEE/9oACAEBAAEFAvonCMkO8Y2YvmvxESxKPfnlzGHkTRKMZI/Kcep8K8KGqGmKL+v5KXpfUUJDtEWK3ZuLG6jFVSYkXQqRCfliySX5F2SdQM/0/DyZeEuE36fS0XTKVjyIeSZHI6NPsXX/AAlChpiryMnD4WqROVLZs+lMkyUyMiSIs9Q7LH9/CmMe0oCsaG3YmR4U+Fn6M6M6M6M6H8HdZJCGrGiLYkRiOiUT6WhsuhiGh1ZRVIsZJjdGZl+EmKWrY4syTOFPpT3PXXU+xtyTdDEQRdkFRH2JcOGJfUujZ/CbIe9JO0XQ0UTjzpB2iy8aNonr87CxSx1kj8Yt8JXJ0SNr+Y5UJ6kZcIz7+wfI2RSbE+tFjLsbGh+hx45/OJj9GVOiBFDTRQrP/8QAHBEBAQACAwEBAAAAAAAAAAAAAAECEQMSITFB/9oACAEDAQE/AdxeRoiZp6xTbbeXLXVw6lPxjOy62YcG3Lf8Xjgw46uOIiVqfZWJbTmn7LWcTtw/1ljfPcEE+2xsmpXl3a8mcYyuofP/xAAcEQEAAgMBAQEAAAAAAAAAAAABAhEDEiExE1H/2gAIAQIBAT8B8WqKEdNrUlzRPMNXp+lGPF/IzW4t4pn2JWNbVsXTxGPGW+nPJ9tHmO3n9WVq7PwV2w6c6w2bPP/EACQQAAIBAwQCAwEBAAAAAAAAAAABERAhMSBBUWECMlBxgZHR/9oACAEBAAY/AvgaW3UPubCXYbWpDpbCxo0T9RUmB60T1tZWE7mPElUjbQs4JHkU9J7/AODkp7p1KepRVpNFOAk3G420UXJ3N/Gd0VHlO6FVfR5n6P8A47miJZCsJ3XVRoSV+Fl3Rvpn4GhYJjU0JY+Cly1Zdi9jYcV4ULC21cE7+Z3O5djYYxJ/Jl+a5KL6VZaXMlzWbDQ0JTrnnT//xAAgEAACAgMAAwEBAQAAAAAAAAAAAREhMRBBUSBhcTCB/9oACAEBAAE/IfhiVjUdIxpDFGPhCyZQ+I+4pIaHQliVeBRFJYjx1MaLfwS6IgiNCHxjUH6XCFbXiD5NHnZK8Mlgjo6QRIUJ7hHqR8FLUOKJgUNfKWmfWN0Kpkb0KT50x1TYvY6wYZssnouuiRBIosrBX2PnhSUxUIwOQ+j+yLQ/s7H7Gvsc4FMZk9EaE9jlQ7HCH9L8PIvwYr3oVmGPH0URRQ9NHNj9DZDiuJC9w4yNeyzY11hbv0Iy19IaGOvJA3VoVFbHUJYx9CIyyTUi60U3fTm8iw9CKxT1UfJxIr7JSzPBLXoeRojCGOEJiQl5L3hCFgaJ4UuNJXvJjWuCIg//2gAMAwEAAgADAAAAEGXUvRnGZvRLFctYTlLWjbRvVldNJZ/RvQyX5beCe4B8Vs/+VbYtdLk/DUMuUVBQ+sXDJYE5/wD/xAAcEQEAAwEBAQEBAAAAAAAAAAAAAREhMUEQUWH/2gAIAQMBAT8QxDhBBr+FDGVYeB4OiHkPX+xCGj4l+L4aXhwxEkTGnwvCEcHFLZKOiRfcwEWlW/sRKx7Fc0j1dNEYeRCvFV9Fv4KUyUoaevA+kbgvQZ7IQmsJdO15fBxIVV5Z2LGVBXZLQRsTnKE5E8cK8i//xAAcEQEBAQEAAwEBAAAAAAAAAAAAAREhMRBBUWH/2gAIAQIBAT8Q+HBZawlYXkSHu8uReTwkj+Mn2LnB5bM8F+i01tvtnwtNfLO54TmGxEiE2Tp2vH4Tnlrl+Tjn3l227LO8Pl//xAAiEAEAAgICAgMBAQEAAAAAAAABABEhMUFRYXGBkaGxEPD/2gAIAQEAAT8Q/wCi/Bl/Zh6cSrLb0iV5gTrQsKhiNWlQDAXmAWDHdVGtlq3CobdzlIuAvRagsK2P2ZfZdHMCqyWJzfuDLQ0p3OrlwItDHM7hsK3D38w+ICwrYgrQpTFLaJxMGgxD2y5fLaOIAgX4Zi3yvQtRTlXuDUzDO8R+EFsJVUYhoAXLXCPSPUNK2QWxVdy8HfRAXTFZOtP2W5vEDMUMHM6RanEAcQI0Bce4RCrIhMpDaVFCDcfExLuYwPUwm1/kqgAMkVOviCbcbmPW4jdMdHmZ6hfMoSBhS4TF5cw1Ga0dTLKuCy8XhI3bBAMsM6gFEwV+YAE5AhhYzVzTDgTiF5B8xK7xAXdRXXMdmCI33GrcOTKfzEqMfuJKAQtpRZKmEtKlZCDHxHeoFrD1LzqVOZQqW0JULXOiG4RxG2oXbGtdxbHLZBiMAUXYQYLOo3tXRKLaMX6i3rWoYe+YCuiDVuKg2G5pjctyyHPiKrtJXi4IKt3CcLKyIb3dxhAXLkCcamhXEYNdxVmKyohZYl8B9Sw1LlCm4OxgKQl0sxHdVGDmOMSwtKcQxY8Q3lZliC+IxrcDU4ji29wFAx7jfTLbP4lmwbIKpMwgOUKOLhDbxKAagCqJfLW5bVEo3HYItrDmcLcqwMEGgfkZQ3DMy+5hwQdHzApFLlqRTsXLu8yrl9S3yiNqnlj7gCMKKPcP9NbhFD4lBqYfhKJXcfplJ//Z';
            }
            
            if (!imageContent) {
                console.log('❌ Failed to get image content');
                continue;
            }
            
            // Prepare request for the Vertex AI endpoint
            const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
            
            const request = {
                endpoint: endpointPath,
                instances: [
                    {
                        content: imageContent
                    }
                ],
                parameters: {
                    confidenceThreshold: 0.0,
                    maxPredictions: 5
                }
            };
            
            console.log(`Sending prediction request to endpoint: ${endpointPath}`);
            
            try {
                // Make the prediction request
                const [response] = await predictionClient.predict(request);
                
                console.log('✅ Prediction successful');
                console.log('Deployed model ID:', response.deployedModelId || 'N/A');
                
                if (response.predictions && response.predictions.length > 0) {
                    const prediction = response.predictions[0];
                    
                    if (prediction.displayNames && prediction.confidences) {
                        console.log(`Received ${prediction.displayNames.length} predictions`);
                        
                        if (prediction.displayNames.length > 0) {
                            console.log('Top predictions:');
                            for (let i = 0; i < Math.min(3, prediction.displayNames.length); i++) {
                                console.log(`  ${prediction.displayNames[i]}: ${(prediction.confidences[i] * 100).toFixed(2)}%`);
                            }
                        } else {
                            console.log('⚠️ Received empty display names array');
                        }
                    } else {
                        console.log('⚠️ Prediction missing displayNames or confidences');
                        console.log('Raw prediction:', prediction);
                    }
                } else {
                    console.log('⚠️ No predictions returned');
                    console.log('Raw response:', response);
                }
            } catch (error) {
                console.error(`❌ Prediction failed for ${veinType} endpoint:`, error);
                
                // Check for specific error conditions
                const errorMessage = error.message || '';
                
                if (errorMessage.includes('Permission denied')) {
                    console.error('⚠️ Permission issue - check service account roles');
                } else if (errorMessage.includes('not found')) {
                    console.error('⚠️ Endpoint not found - check endpoint ID');
                } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                    console.error('⚠️ Resource quota exceeded - check project quota limits');
                } else if (errorMessage.includes('Failed to process request')) {
                    console.error('⚠️ Model processing error - model might be warming up or failing');
                }
            }
        }
        
        console.log('\n=== Direct Vertex AI testing complete ===');
        
    } catch (error) {
        console.error('Failed to test Vertex AI endpoints:', error);
    }
}

// Execute the test
testAllVeinTypes(); 