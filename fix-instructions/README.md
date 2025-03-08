# VExUS System Fixes

This document provides instructions for fixing the issues identified in the VExUS prediction system.

## Issue #1: Port Conflict (Fixed)

The server was failing to start because port 3002 was already in use by another process.

**Solution:** Kill the process using port 3002:
```bash
# Find the process using port 3002
lsof -i :3002
# Kill the process
kill <PID>
```

## Issue #2: GCS URI Format (Not Supported)

The GCS URI approach for image prediction is failing because Vertex AI expects base64 encoded image data.

**Solution:** Standardize on using the Base64 content approach, which has been proven to work reliably. The `simplified-prediction.js` file has been updated to use this approach.

## Issue #3: On-Demand Service Error (Needs Deployment)

The on-demand service is returning a 500 error with message "Unexpected type" because it's not properly handling the base64 encoded image data.

**Solution:** 

1. The fixed version of the on-demand service is provided in `endpoints-on-demand/main.py.fix`.
2. To deploy the fix:

```bash
# Copy the fixed version to the main file
cp endpoints-on-demand/main.py.fix endpoints-on-demand/main.py

# Deploy to Cloud Run (if using Google Cloud)
cd endpoints-on-demand
gcloud run deploy endpoints-on-demand \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --project plucky-weaver-450819-k7
```

## Key Changes Made

1. In the `get_prediction` function of the on-demand service, we've fixed how it handles the input data:
   - Now it correctly processes the base64 encoded image in the `{ content: base64string }` format
   - It properly validates the input format and provides clear error messages
   - It passes the instances directly to the Vertex AI endpoint without the problematic Value conversion

2. In `simplified-prediction.js`, we've:
   - Standardized on the Base64 content approach
   - Added more detailed debugging information
   - Improved error handling

## Testing the Fix

After implementing these changes, you can test the system using:

```bash
node simplified-prediction.js
```

The output should show successful prediction using both direct Vertex AI and the on-demand service.

## Additional Recommendations

1. **Compression**: If image sizes are large, consider resizing or compressing images before base64 encoding for better performance.

2. **Error Handling**: The improved error handling in both the client and server code will make debugging easier in the future.

3. **Monitoring**: Set up monitoring for the on-demand service to track error rates and performance. 