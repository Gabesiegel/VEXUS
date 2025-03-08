# VEXUS Server Fixes

## Overview

This document summarizes the fixes made to the `server.js` file to address various issues and improve the code quality.

## Issues Fixed

1. **Code Duplication**
   - Created a helper function `makeDirectVertexAIPrediction` to centralize the direct Vertex AI prediction logic
   - Removed duplicate code blocks in the `/api/predict` endpoint

2. **Variable Scope Issues**
   - Fixed variable scope issues in the error handling sections
   - Added proper variable initialization to ensure variables are defined before use
   - Added fallback values for variables that might be undefined

3. **Logical Flow Problems**
   - Restructured nested try-catch blocks to improve readability and maintainability
   - Simplified the error handling logic in the `/api/predict` endpoint
   - Improved the fallback logic between on-demand service and direct Vertex AI calls

4. **Error Handling**
   - Standardized error responses across endpoints
   - Added more context to error messages for better debugging
   - Improved error logging with more detailed information

5. **Port Configuration**
   - Fixed inconsistent port configuration that was causing issues in Cloud Run
   - Ensured the server consistently uses the PORT environment variable with a default of 3002
   - Removed redundant PORT variable assignment that was overriding the initial configuration

## Implementation Details

### 1. Helper Function for Direct Vertex AI Prediction

Created a new function `makeDirectVertexAIPrediction` that encapsulates the logic for making direct calls to Vertex AI:

```javascript
async function makeDirectVertexAIPrediction(veinType, instances, parameters) {
    console.log(`Making direct Vertex AI prediction for ${veinType} vein`);
    
    try {
        // Initialize Vertex AI client if not already done
        if (!predictionClient) {
            predictionClient = await initializeVertexAI();
        }
        
        const endpointId = CONFIG.endpointIds[veinType];
        const endpointPath = `projects/${CONFIG.projectNumber}/locations/${CONFIG.location}/endpoints/${endpointId}`;
        
        console.log(`Sending direct prediction request to endpoint: ${endpointPath}`);
        
        // Create the request object for direct Vertex AI call
        const directRequest = {
            endpoint: endpointPath,
            instances: instances,
            parameters: parameters || {
                confidenceThreshold: 0.0,
                maxPredictions: 5
            }
        };
        
        // Add diagnostic logging for direct API request
        await logDiagnostics('DIRECT_REQUEST', directRequest, null, veinType);
        
        const [directResponse] = await predictionClient.predict(directRequest);
        
        // Add diagnostic logging for direct API response
        await logDiagnostics('DIRECT_RESPONSE', directResponse, null, veinType);
        
        // Schedule endpoint shutdown after the direct API call
        scheduleEndpointShutdown(veinType);
        
        return directResponse;
    } catch (error) {
        console.error('Direct Vertex AI call failed:', error);
        
        // Add diagnostic logging for direct API error
        await logDiagnostics('DIRECT_ERROR', null, error, veinType);
        
        // Schedule endpoint shutdown even after error
        scheduleEndpointShutdown(veinType);
        
        throw error;
    }
}
```

### 2. Improved Error Handling

Simplified the error handling in the `/api/predict` endpoint:

```javascript
try {
    // Main prediction logic
} catch (error) {
    // Get vein type from request if not already defined
    const veinType = req.body?.metadata?.veinType || req.body?.veinType || 'hepatic';
    
    console.error(`Prediction error for ${veinType}:`, error);
    
    // Add diagnostic logging for error
    await logDiagnostics('PREDICTION_ERROR', null, error, veinType);
    
    // Return the error to the client
    return res.status(500).json({ 
        error: error.message || 'An unexpected error occurred during prediction',
        veinType: veinType,
        timestamp: new Date().toISOString()
    });
} finally {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`Prediction request completed in ${duration}ms`);
}
```

### 3. Refactored Prediction Logic

Updated the prediction logic in the `/api/predict` endpoint to use the new helper function:

```javascript
// Try direct vertex AI call as a fallback
console.log('Falling back to direct Vertex AI call');

try {
    // Use the helper function for direct Vertex AI prediction
    const directResponse = await makeDirectVertexAIPrediction(veinType, instances, parameters);
    
    // If direct call also fails to provide predictions, return error instead of using mock
    if (!directResponse.predictions || 
        directResponse.predictions.length === 0 || 
        !directResponse.predictions[0].displayNames || 
        directResponse.predictions[0].displayNames.length === 0) {
        
        console.log('Direct call also returned empty predictions, returning error');
        
        // Log the empty prediction response
        await logDiagnostics('EMPTY_PREDICTION_ERROR', directResponse, null, veinType);
        
        // Return an error response to the client
        return res.status(404).json({
            error: 'No predictions available from AI model',
            details: 'Both on-demand service and direct calls returned empty predictions',
            veinType: veinType,
            timestamp: new Date().toISOString()
        });
    }
    
    // Return the direct prediction response
    return res.json({
        displayNames: directResponse.predictions[0].displayNames || [],
        confidences: directResponse.predictions[0].confidences || [],
        modelId: directResponse.deployedModelId || null,
        method: 'direct', // Indicate this was a direct call
        timestamp: new Date().toISOString()
    });
} catch (directError) {
    // Error handling for direct Vertex AI call
}
```

### 4. Fixed Port Configuration

Fixed inconsistent port configuration that was causing issues in Cloud Run:

```javascript
// Before:
const DEFAULT_PORT = process.env.PORT || 3002;
let PORT = DEFAULT_PORT;

// Later in the code:
PORT = process.env.PORT || 3003; // This was overriding the initial configuration
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`);
});

// After:
const DEFAULT_PORT = process.env.PORT || 3002;
let PORT = DEFAULT_PORT;

// Later in the code:
// Use the DEFAULT_PORT variable consistently
app.listen(DEFAULT_PORT, () => {
    console.log(`Server running on port ${DEFAULT_PORT}`);
    console.log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`);
});
```

## Testing

The server was successfully tested by:

1. Starting the server with `node server.js`
2. Testing the `/api/local-health` endpoint with `curl http://localhost:3002/api/local-health`
3. Verifying that the server responds with a 200 OK status and the expected JSON response

## Conclusion

The fixes made to the `server.js` file have improved the code quality, reduced duplication, and fixed various issues with variable scope and error handling. The server now runs successfully and responds to requests as expected.
