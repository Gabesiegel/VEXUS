import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

// Configuration with the correct endpoint IDs from server.js
const CONFIG = {
    projectId: "plucky-weaver-450819-k7",
    projectNumber: "456295042668",
    location: "us-central1",
    endpointIds: {
        hepatic: "8159951878260523008",  // Hepatic vein prediction endpoint
        renal: "1148704877514326016",    // Renal vein prediction endpoint
        portal: "2970410926785691648"    // Portal vein prediction endpoint
    },
    onDemandEndpointService: "https://endpoints-on-demand-456295042668.us-central1.run.app"
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * Wrapper for fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

/**
 * Tests connectivity to the on-demand endpoint service
 */
async function testOnDemandService() {
    console.log(`\n${colors.cyan}Testing On-Demand Endpoint Service...${colors.reset}`);
    
    try {
        // First try health check
        const healthResponse = await fetchWithTimeout(`${CONFIG.onDemandEndpointService}/health`, {}, 10000);
        
        if (!healthResponse.ok) {
            console.log(`${colors.red}✗ On-Demand service health check failed: ${healthResponse.status}${colors.reset}`);
            return false;
        }

        // Then try quota check
        const quotaResponse = await fetchWithTimeout(`${CONFIG.onDemandEndpointService}/quota-check`, {}, 10000);
        
        if (quotaResponse.ok) {
            const quotaData = await quotaResponse.json();
            console.log(`${colors.green}✓ On-Demand service is accessible${colors.reset}`);
            console.log(`Quota status: ${quotaData.status || 'OK'}`);
            return true;
        } else {
            console.log(`${colors.red}✗ On-Demand service quota check failed: ${quotaResponse.status}${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ Error accessing On-Demand service:${colors.reset}`, error.message);
        return false;
    }
}

/**
 * Tests a specific endpoint through the on-demand service
 */
async function testEndpoint(veinType) {
    console.log(`\n${colors.cyan}Testing ${veinType} endpoint through on-demand service...${colors.reset}`);
    
    try {
        const endpointId = CONFIG.endpointIds[veinType];
        console.log(`Using endpoint ID: ${endpointId}`);

        // Test endpoint with a more realistic test image (32x32 PNG)
        const minimalPayload = {
            instances: [
                {
                    content: "/9j/4AAQSkZJRgABAQEAYABgAAD/4QBmRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAExAAIAAAAQAAAATgAAAAAAAABgAAAAAQAAAGAAAAABcGFpbnQubmV0IDUuMC4xAP/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIACAAIAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APn+iiigAooooAKKKKACiiigAooooAKKKKAP/9k="
                }
            ],
            parameters: {
                confidenceThreshold: 0.0,
                maxPredictions: 1
            },
            metadata: {
                veinType: veinType,
                endpointId: endpointId,
                testing: true,
                timestamp: Date.now()
            }
        };

        // First try to ping the endpoint
        console.log(`Pinging ${veinType} endpoint...`);
        const pingResponse = await fetchWithTimeout(
            `${CONFIG.onDemandEndpointService}/ping/${veinType}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    endpointId: endpointId,
                    veinType: veinType
                })
            },
            15000 // 15 second timeout for ping
        );

        if (!pingResponse.ok) {
            const pingErrorText = await pingResponse.text();
            console.log(`${colors.yellow}! Ping endpoint returned ${pingResponse.status}: ${pingErrorText}, proceeding with prediction test${colors.reset}`);
        } else {
            const pingData = await pingResponse.json();
            console.log(`${colors.green}✓ Ping successful - ${JSON.stringify(pingData)}${colors.reset}`);
        }

        // Then try prediction
        console.log(`Testing prediction for ${veinType}...`);
        const response = await fetchWithTimeout(
            `${CONFIG.onDemandEndpointService}/predict/${veinType}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(minimalPayload)
            },
            30000 // 30 second timeout for predictions
        );
        
        if (response.ok) {
            const data = await response.json();
            console.log(`${colors.green}✓ ${veinType} endpoint is accessible${colors.reset}`);
            console.log(`Status: ${data.status || 'OK'}`);
            console.log(`Endpoint ID: ${endpointId}`);
            return true;
        } else {
            const errorText = await response.text();
            console.log(`${colors.red}✗ ${veinType} endpoint error: ${response.status}${colors.reset}`);
            console.log(`Error details: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error(`${colors.red}✗ Error testing ${veinType} endpoint:${colors.reset}`, error.message);
        return false;
    }
}

/**
 * Main function to run all tests
 */
async function main() {
    console.log(`${colors.magenta}=== VExUS Endpoint Connectivity Test ===${colors.reset}`);
    console.log(`${colors.blue}Project: ${CONFIG.projectNumber}${colors.reset}`);
    console.log(`${colors.blue}Location: ${CONFIG.location}${colors.reset}`);
    
    // First test the on-demand service
    const serviceAvailable = await testOnDemandService();
    
    if (!serviceAvailable) {
        console.log(`\n${colors.yellow}On-Demand service is not accessible. Endpoint tests may fail.${colors.reset}`);
    }
    
    // Test each endpoint
    const results = {};
    for (const [veinType, endpointId] of Object.entries(CONFIG.endpointIds)) {
        results[veinType] = await testEndpoint(veinType);
    }
    
    // Print summary
    console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}`);
    console.log(`${colors.blue}On-Demand Service:${colors.reset} ${serviceAvailable ? colors.green + '✓ AVAILABLE' : colors.red + '✗ NOT AVAILABLE'}${colors.reset}`);
    
    for (const [veinType, result] of Object.entries(results)) {
        console.log(`${colors.blue}${veinType} Endpoint:${colors.reset} ${result ? colors.green + '✓ ACCESSIBLE' : colors.red + '✗ NOT ACCESSIBLE'}${colors.reset}`);
    }
    
    // Provide recommendations if any tests failed
    const anyFailed = !serviceAvailable || Object.values(results).some(result => !result);
    if (anyFailed) {
        console.log(`\n${colors.yellow}Some tests failed. Recommendations:${colors.reset}`);
        console.log(`1. Verify endpoint IDs in configuration`);
        console.log(`2. Check Vertex AI API is enabled`);
        console.log(`3. Verify service account permissions`);
        console.log(`4. Check quota limits in Google Cloud Console`);
    }
}

// Run the tests
main().catch(error => {
    console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
    process.exit(1);
}); 