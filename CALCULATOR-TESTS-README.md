# Calculator On-Demand Endpoint Testing

This document explains how to verify that the calculator.html is correctly using the on-demand endpoint and prewarming functionality.

## Background

The calculator.html page has been modified to:

1. Use the on-demand endpoint exclusively (no fallback to direct Vertex AI calls)
2. Use the prewarming functionality to warm up the endpoints before use

These changes ensure that the calculator always uses the on-demand service, which provides better performance, reliability, and cost management compared to direct Vertex AI calls.

## Test Scripts

Three test scripts have been provided to verify these changes:

1. `test-calculator-direct.js` - Directly tests the server's API endpoints
2. `test-calculator-logs.js` - Monitors server logs for evidence of on-demand usage and prewarming
3. `test-calculator-ondemand.js` - Sets up a proxy server to intercept and analyze requests

### 1. Direct API Testing

The `test-calculator-direct.js` script directly tests the server's API endpoints by simulating the requests that calculator.html would make.

#### How to use:

```bash
# Make sure the server is running
node server.js

# In a separate terminal, run the test script
node test-calculator-direct.js
```

This script will:
- Test the prewarming endpoint for each vein type
- Test the prediction endpoint for each vein type with the `onlyOnDemand` flag
- Analyze the responses to verify that the server is handling the requests correctly

### 2. Log Monitoring

The `test-calculator-logs.js` script monitors the server log files for evidence of on-demand usage and prewarming.

#### How to use:

```bash
# Start the log monitoring script
node test-calculator-logs.js

# In a separate terminal, start the server
node server.js

# Open the calculator in your browser
# http://localhost:3002/calculator.html

# Interact with the calculator (upload images, etc.)

# Press Ctrl+C in the log monitoring terminal when done
```

This script will:
- Monitor the server.log and server_debug.log files
- Look for evidence of prewarming requests
- Look for evidence of prediction requests with the onlyOnDemand flag
- Look for evidence of direct Vertex AI calls (which should not occur)
- Provide an analysis of the logs when you press Ctrl+C

### 3. Proxy Server

The `test-calculator-ondemand.js` script sets up a proxy server to intercept and analyze requests between the browser and the server.

#### How to use:

```bash
# Start the proxy server
node test-calculator-ondemand.js

# In a separate terminal, start the main server on port 3003
PORT=3003 node server.js

# Open the calculator in your browser using the proxy URL
# http://localhost:3004/calculator.html

# Interact with the calculator (upload images, etc.)

# Press Ctrl+C in the proxy server terminal when done
```

This script will:
- Set up a proxy server on port 3004
- Intercept requests to the preload-endpoint and predict endpoints
- Analyze the requests to verify that they include the correct parameters
- Provide an analysis of the requests when you press Ctrl+C

## Expected Results

If the calculator.html is correctly using the on-demand endpoint and prewarming functionality, you should see:

1. Prewarming requests for each vein type (hepatic, portal, renal)
2. Prediction requests with the `onlyOnDemand: true` flag in the metadata
3. No direct Vertex AI calls or fallbacks

## Troubleshooting

If the tests fail, check the following:

1. Make sure the server.js file has been updated to support the `onlyOnDemand` flag
2. Make sure the calculator.html file has been updated to include the `onlyOnDemand: true` flag in the metadata
3. Check the server logs for any errors or unexpected behavior
4. Verify that the prewarming functionality is being called during page initialization

## Manual Verification

You can also manually verify that the calculator.html is using the on-demand endpoint and prewarming functionality:

1. Open the browser's developer tools (F12)
2. Go to the Network tab
3. Open the calculator.html page
4. Look for requests to `/api/preload-endpoint` (prewarming)
5. Upload an image and look for requests to `/api/predict`
6. Examine the request payload to verify it includes `onlyOnDemand: true` in the metadata
7. Examine the response to verify it includes `method: "ondemand"`

## Server Modifications

The server.js file has been modified to:

1. Check for the `onlyOnDemand` flag in requests:
   ```javascript
   const onlyUseOnDemand = req.query.onlyOnDemand === 'true' || 
                          req.body.metadata?.onlyOnDemand === true || 
                          req.body.onlyOnDemand === true || 
                          process.env.ONLY_USE_ONDEMAND === 'true';
   ```

2. Prevent fallback to direct Vertex AI calls when the flag is set:
   ```javascript
   if (onlyUseOnDemand) {
       console.log('On-demand service returned empty predictions, but only using on-demand service as requested');
       return res.status(404).json({
           error: 'No predictions available from on-demand service',
           details: 'On-demand service returned empty predictions and fallback to direct calls is disabled',
           veinType: veinType,
           timestamp: new Date().toISOString()
       });
   }
   ```

## Calculator Modifications

The calculator.html file has been modified to:

1. Include the `onlyOnDemand: true` flag in the metadata:
   ```javascript
   metadata: {
       veinType: type,
       imageType: mimeType,
       timestamp: Date.now(),
       onlyOnDemand: true // Only use on-demand endpoint, no fallback to direct calls
   }
   ```

2. Use the prewarming functionality during initialization:
   ```javascript
   // Warm up endpoints with detailed status updates
   await warmUpEndpoints();
   ```
