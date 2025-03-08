#!/usr/bin/env node

/**
 * Script to fix the server.js file to use the proper format for direct Vertex AI calls
 * 
 * This script updates the server.js file to use the proper format from the Vertex AI
 * documentation for direct Vertex AI calls, while still prioritizing the on-demand service.
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
        
        // 1. Update the imports to include the necessary modules for the proper format
        let updatedServerJs = serverJs.replace(
            /import { PredictionServiceClient } from '@google-cloud\/aiplatform';/,
            `import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { protos } from '@google-cloud/aiplatform';`
        );
        
        // 2. Update the direct Vertex AI call in the predict endpoint
        updatedServerJs = updatedServerJs.replace(
            /\/\/ Try direct vertex AI call as a fallback[\s\S]*?try {[\s\S]*?\/\/ Initialize Vertex AI client if not already done[\s\S]*?if \(!predictionClient\) {[\s\S]*?predictionClient = await initializeVertexAI\(\);[\s\S]*?}[\s\S]*?const endpointId = CONFIG\.endpointIds\[veinType\];[\s\S]*?const endpointPath = `projects\/\${CONFIG\.projectNumber}\/locations\/\${CONFIG\.location}\/endpoints\/\${endpointId}`;[\s\S]*?console\.log\(`Sending direct prediction request to endpoint: \${endpointPath}`\);[\s\S]*?\/\/ Create the request object for direct Vertex AI call[\s\S]*?const directRequest = {[\s\S]*?endpoint: endpointPath,[\s\S]*?instances: instances,[\s\S]*?parameters: parameters[\s\S]*?};/,
            `// Try direct vertex AI call as a fallback
        console.log('Falling back to direct Vertex AI call using proper format');
        
        try {
            // Get the instance and params classes from the protos
            const {instance, params, prediction} = protos.google.cloud.aiplatform.v1.schema.predict;
            
            // Initialize Vertex AI client if not already done
            if (!predictionClient) {
                predictionClient = await initializeVertexAI();
            }
            
            const endpointId = CONFIG.endpointIds[veinType];
            const endpointPath = \`projects/\${CONFIG.projectId}/locations/\${CONFIG.location}/endpoints/\${endpointId}\`;
            
            console.log(\`Sending direct prediction request to endpoint: \${endpointPath}\`);
            
            // Create parameters object using the proper format
            const parametersObj = new params.ImageClassificationPredictionParams({
                confidenceThreshold: parameters?.confidenceThreshold || 0.0,
                maxPredictions: parameters?.maxPredictions || 5,
            });
            const formattedParameters = parametersObj.toValue();
            
            // Create instance objects using the proper format
            const formattedInstances = instances.map(instance => {
                const instanceObj = new instance.ImageClassificationPredictionInstance({
                    content: instance.content
                });
                return instanceObj.toValue();
            });
            
            // Create the request object for direct Vertex AI call
            const directRequest = {
                endpoint: endpointPath,
                instances: formattedInstances,
                parameters: formattedParameters
            };`
        );
        
        // 3. Update the processing of the direct Vertex AI response
        updatedServerJs = updatedServerJs.replace(
            /\/\/ Return the prediction response[\s\S]*?return res\.json\({[\s\S]*?displayNames: directResponse\.predictions\[0\]\.displayNames \|\| \[\],[\s\S]*?confidences: directResponse\.predictions\[0\]\.confidences \|\| \[\],[\s\S]*?modelId: directResponse\.deployedModelId \|\| null,[\s\S]*?method: 'direct', \/\/ Indicate this was a direct call[\s\S]*?timestamp: new Date\(\)\.toISOString\(\),[\s\S]*?storage: imageInfo \? {[\s\S]*?stored: true,[\s\S]*?imageUrl: imageInfo\.url,[\s\S]*?resultsPath: imageInfo\.id[\s\S]*?} : null[\s\S]*?}\);/,
            `// Process the predictions using the proper format
                    const predictions = directResponse.predictions;
                    let displayNames = [];
                    let confidences = [];
                    let ids = [];
                    
                    // Extract the predictions from the response
                    if (predictions && predictions.length > 0) {
                        const predictionResultObj = prediction.ClassificationPredictionResult.fromValue(predictions[0]);
                        displayNames = predictionResultObj.displayNames || [];
                        confidences = predictionResultObj.confidences || [];
                        ids = predictionResultObj.ids || [];
                    }
                    
                    // Return the prediction response
                    return res.json({
                        displayNames: displayNames,
                        confidences: confidences,
                        ids: ids,
                        modelId: directResponse.deployedModelId || null,
                        method: 'direct', // Indicate this was a direct call
                        timestamp: new Date().toISOString(),
                        storage: imageInfo ? {
                            stored: true,
                            imageUrl: imageInfo.url,
                            resultsPath: imageInfo.id
                        } : null
                    });`
        );
        
        // Write the updated server.js file
        console.log(`Writing updated server.js to ${serverJsPath}.direct-fix...`);
        await fs.writeFile(`${serverJsPath}.direct-fix`, updatedServerJs);
        
        console.log(`Successfully created ${serverJsPath}.direct-fix`);
        console.log(`To apply the fix, run: cp ${serverJsPath}.direct-fix ${serverJsPath}`);
        
        return true;
    } catch (error) {
        console.error(`Error fixing server.js:`, error);
        return false;
    }
}

// Main function
async function main() {
    try {
        console.log("=== Fixing Server.js for Direct Vertex AI Calls ===");
        
        // Fix the server.js file
        const success = await fixServerJs();
        
        if (success) {
            console.log("\n=== Fix completed successfully ===");
            console.log("The fix has been written to server.js.direct-fix");
            console.log("To apply the fix, you need to:");
            console.log("1. Review the changes in server.js.direct-fix");
            console.log("2. Copy the fixed file to replace the original:");
            console.log("   cp server.js.direct-fix server.js");
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
