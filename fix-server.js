#!/usr/bin/env node

/**
 * Script to fix the server.js file
 * 
 * This script updates the server.js file to use the on-demand service
 * instead of trying to make direct Vertex AI calls.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server.js file
const serverJsPath = path.join(__dirname, 'server.js');

// Function to fix the server.js file
async function fixServerJs() {
    try {
        console.log(`Reading ${serverJsPath}...`);
        const serverJs = await fs.readFile(serverJsPath, 'utf8');
        
        // Make the necessary changes to the server.js file
        
        // 1. Update the onDemandEndpointService to use the correct URL
        let updatedServerJs = serverJs.replace(
            /onDemandEndpointService: process\.env\.ON_DEMAND_ENDPOINT_SERVICE \|\| ".*"/,
            'onDemandEndpointService: process.env.ON_DEMAND_ENDPOINT_SERVICE || "https://endpoints-on-demand-456295042668.us-central1.run.app"'
        );
        
        // 2. Update the makeApiCallWithRetry function to add more logging
        updatedServerJs = updatedServerJs.replace(
            /async function makeApiCallWithRetry\(url, payload, token, veinType, maxRetries = 2\) {[\s\S]*?throw lastError \|\| new Error\('API call failed after all retries'\);[\s\S]*?}/,
            `async function makeApiCallWithRetry(url, payload, token, veinType, maxRetries = 2) {
    let retries = 0;
    let lastError = null;
    
    while (retries <= maxRetries) {
        try {
            console.log(\`Making API call to \${url} (attempt \${retries + 1}/\${maxRetries + 1})\`);
            console.log(\`Payload: \${JSON.stringify({
                ...payload,
                instances: payload.instances.map(instance => ({
                    ...instance,
                    content: instance.content ? \`[BASE64 DATA - \${instance.content.length} chars]\` : undefined
                }))
            }, null, 2)}\`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(\`API call failed with status \${response.status}: \${errorText}\`);
            }
            
            const result = await response.json();
            console.log(\`API call succeeded with result: \${JSON.stringify(result, null, 2)}\`);
            return result;
        } catch (error) {
            console.error(\`API call attempt \${retries + 1} failed:\`, error.message);
            lastError = error;
            retries++;
            
            if (retries <= maxRetries) {
                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, retries) * 1000;
                console.log(\`Waiting \${delay}ms before retry...\`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('API call failed after all retries');
}`
        );
        
        // 3. Update the predict endpoint to prioritize the on-demand service and add more logging
        updatedServerJs = updatedServerJs.replace(
            /\/\/ First try the on-demand service[\s\S]*?console\.log\('Calling on-demand service for prediction'\);/,
            `// First try the on-demand service
        console.log('Calling on-demand service for prediction');
        console.log(\`Using on-demand service URL: \${CONFIG.onDemandEndpointService}\`);`
        );
        
        // Write the updated server.js file
        console.log(`Writing updated server.js to ${serverJsPath}.fix...`);
        await fs.writeFile(`${serverJsPath}.fix`, updatedServerJs);
        
        console.log(`Successfully created ${serverJsPath}.fix`);
        console.log(`To apply the fix, run: cp ${serverJsPath}.fix ${serverJsPath}`);
        
        return true;
    } catch (error) {
        console.error(`Error fixing server.js:`, error);
        return false;
    }
}

// Main function
async function main() {
    try {
        console.log("=== Fixing Server.js ===");
        
        // Fix the server.js file
        const success = await fixServerJs();
        
        if (success) {
            console.log("\n=== Fix completed successfully ===");
            console.log("The fix has been written to server.js.fix");
            console.log("To apply the fix, you need to:");
            console.log("1. Review the changes in server.js.fix");
            console.log("2. Copy the fixed file to replace the original:");
            console.log("   cp server.js.fix server.js");
            console.log("3. Restart the server");
        } else {
            console.log("\n=== Fix failed ===");
            console.log("Please check the error messages above and try again.");
        }
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
