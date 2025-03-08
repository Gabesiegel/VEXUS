#!/usr/bin/env node

/**
 * Test script to troubleshoot different payload formats for the on-demand endpoint service
 */

import fetch from 'node-fetch';

// Configuration
const SERVICE_URL = process.env.ON_DEMAND_ENDPOINT_SERVICE || 'https://endpoints-on-demand-456295042668.us-central1.run.app';
const VEIN_TYPE = 'hepatic';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

// A minimal 1x1 transparent PNG image
const baseImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * Call the on-demand endpoint service with a specific format
 */
async function callService(format, payload) {
    try {
        console.log(`${colors.blue}Testing format: ${format}${colors.reset}`);
        console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
        
        const response = await fetch(`${SERVICE_URL}/predict/${VEIN_TYPE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const status = response.status;
        let data;
        
        try {
            data = await response.json();
        } catch (e) {
            data = await response.text();
        }
        
        console.log(`${colors.cyan}Response (${status}):${colors.reset}`);
        if (typeof data === 'object') {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(data);
        }
        
        console.log(`${format}: ${status === 200 ? colors.green + 'SUCCESS' : colors.red + 'FAILED'}${colors.reset}`);
        console.log('-----------------------------------');
        
        return { status, data };
    } catch (error) {
        console.error(`${colors.red}Error:${colors.reset}`, error);
        console.log(`${format}: ${colors.red}FAILED${colors.reset}`);
        console.log('-----------------------------------');
        return { status: 500, error: error.message };
    }
}

/**
 * Main test function
 */
async function main() {
    console.log(`${colors.magenta}=== Testing Different Payload Formats ===${colors.reset}\n`);
    
    // Clean up any existing endpoints
    console.log(`${colors.yellow}Cleaning up existing endpoints...${colors.reset}`);
    await fetch(`${SERVICE_URL}/cleanup`, { method: 'POST' });
    
    // Format 1: Simple content string (what we've been trying)
    const format1 = {
        instances: [
            {
                content: baseImage
            }
        ]
    };
    
    // Format 2: Nested b64 field (common for Vertex AI)
    const format2 = {
        instances: [
            {
                content: {
                    b64: baseImage
                }
            }
        ]
    };
    
    // Format 3: With data URI prefix
    const format3 = {
        instances: [
            {
                content: `data:image/png;base64,${baseImage}`
            }
        ]
    };
    
    // Format 4: Different structure entirely
    const format4 = {
        instances: [
            {
                image: {
                    imageBytes: baseImage
                }
            }
        ]
    };
    
    // Format 5: Using ByteContent as described in some Vertex AI docs
    const format5 = {
        instances: [
            {
                ByteContent: baseImage
            }
        ]
    };
    
    // Execute tests
    await callService('Format 1: Simple content string', format1);
    await callService('Format 2: Nested b64 field', format2);
    await callService('Format 3: With data URI prefix', format3);
    await callService('Format 4: Different structure', format4);
    await callService('Format 5: ByteContent field', format5);
    
    // Clean up endpoints
    console.log(`${colors.yellow}Cleaning up endpoints...${colors.reset}`);
    await fetch(`${SERVICE_URL}/cleanup`, { method: 'POST' });
    
    console.log(`\n${colors.green}Test completed!${colors.reset}`);
}

// Run the test
main().catch(error => {
    console.error(`${colors.red}Error in main:${colors.reset}`, error);
    process.exit(1);
}); 