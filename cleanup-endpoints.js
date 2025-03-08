#!/usr/bin/env node

/**
 * Cleanup script for VExUS endpoints
 * This script helps clean up unused Vertex AI endpoints to resolve quota issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    region: "us-central1"
};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prompt for user input
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

/**
 * List all endpoints
 */
async function listEndpoints() {
    try {
        console.log(`Listing all endpoints in ${CONFIG.region}...`);
        const { stdout, stderr } = await execAsync(`gcloud ai endpoints list --region=${CONFIG.region} --project=${CONFIG.projectId}`);
        
        if (stderr) {
            console.error(`Error: ${stderr}`);
        }
        
        console.log(stdout);
        
        // Parse the endpoint IDs and names
        const lines = stdout.split('\n').filter(line => line.trim() !== '');
        
        // Skip the header row
        const endpoints = [];
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(/\s+/);
            if (parts.length >= 2) {
                endpoints.push({
                    id: parts[0],
                    displayName: parts[1]
                });
            }
        }
        
        return endpoints;
    } catch (error) {
        console.error('Error listing endpoints:', error.message);
        return [];
    }
}

/**
 * Delete an endpoint
 */
async function deleteEndpoint(endpointId) {
    try {
        console.log(`Deleting endpoint ${endpointId}...`);
        const { stdout, stderr } = await execAsync(
            `gcloud ai endpoints delete ${endpointId} --region=${CONFIG.region} --project=${CONFIG.projectId} --quiet`
        );
        
        if (stderr && !stderr.includes('Deleted')) {
            console.error(`Error: ${stderr}`);
            return false;
        }
        
        console.log(stdout || 'Endpoint deleted successfully');
        return true;
    } catch (error) {
        console.error(`Error deleting endpoint ${endpointId}:`, error.message);
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log("=== VExUS Endpoint Cleanup Utility ===");
        console.log("This utility helps clean up unused Vertex AI endpoints to resolve quota issues.");
        console.log("");
        
        // List all endpoints
        const endpoints = await listEndpoints();
        
        if (endpoints.length === 0) {
            console.log("No endpoints found.");
            return;
        }
        
        console.log(`Found ${endpoints.length} endpoints.`);
        
        // Prompt user for action
        const action = await prompt("\nWhat would you like to do?\n1. Delete all endpoints\n2. Delete specific endpoints\n3. Exit\nSelect (1-3): ");
        
        switch (action) {
            case '1':
                // Delete all endpoints
                console.log(`\nDeleting all ${endpoints.length} endpoints...`);
                const confirmation = await prompt(`Are you sure you want to delete all ${endpoints.length} endpoints? (y/n): `);
                
                if (confirmation.toLowerCase() === 'y') {
                    let successCount = 0;
                    for (const endpoint of endpoints) {
                        const success = await deleteEndpoint(endpoint.id);
                        if (success) successCount++;
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    console.log(`\nDeleted ${successCount} out of ${endpoints.length} endpoints.`);
                } else {
                    console.log("Operation cancelled.");
                }
                break;
                
            case '2':
                // Delete specific endpoints
                console.log("\nSelect endpoints to delete by entering their numbers (comma separated):");
                endpoints.forEach((endpoint, index) => {
                    console.log(`${index + 1}. ${endpoint.id} (${endpoint.displayName})`);
                });
                
                const selection = await prompt("Enter numbers (e.g., 1,3,5) or 'all': ");
                
                let selectedEndpoints = [];
                if (selection.toLowerCase() === 'all') {
                    selectedEndpoints = endpoints;
                } else {
                    const indexes = selection.split(',').map(num => parseInt(num.trim()) - 1);
                    selectedEndpoints = indexes.map(index => endpoints[index]).filter(Boolean);
                }
                
                if (selectedEndpoints.length === 0) {
                    console.log("No valid endpoints selected.");
                    break;
                }
                
                console.log(`\nYou selected ${selectedEndpoints.length} endpoints for deletion.`);
                const confirmSelected = await prompt("Are you sure you want to delete these endpoints? (y/n): ");
                
                if (confirmSelected.toLowerCase() === 'y') {
                    let successCount = 0;
                    for (const endpoint of selectedEndpoints) {
                        const success = await deleteEndpoint(endpoint.id);
                        if (success) successCount++;
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    console.log(`\nDeleted ${successCount} out of ${selectedEndpoints.length} endpoints.`);
                } else {
                    console.log("Operation cancelled.");
                }
                break;
                
            case '3':
                console.log("Exiting...");
                break;
                
            default:
                console.log("Invalid option.");
                break;
        }
        
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        rl.close();
    }
}

// Run the main function
main(); 