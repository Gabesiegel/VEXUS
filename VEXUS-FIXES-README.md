# VEXUS System Fixes - Deployment Guide

This guide provides detailed instructions for deploying the fixes to the VEXUS system. These fixes address issues with the on-demand endpoint service and direct Vertex AI calls.

## Overview of Fixes

1. **Environment Variable Update**: The `ON_DEMAND_ENDPOINT_SERVICE` environment variable in the Cloud Run configuration has been updated to use the correct URL.

2. **Server.js Enhancements**: The server.js file has been updated to prioritize the on-demand service and add more detailed logging.

3. **Direct Vertex AI Calls Fix**: The server.js file has been updated to use the proper format for direct Vertex AI calls as a backup option.

## Deployment Steps

### 1. Update Cloud Run Environment Variables

The environment variables for the main VEXUS service have already been updated with the correct on-demand endpoint service URL:

```
ON_DEMAND_ENDPOINT_SERVICE=https://endpoints-on-demand-456295042668.us-central1.run.app
```

Verify that this environment variable is correctly set in the Cloud Run configuration for the VEXUS service.

### 2. Deploy the Updated Server.js File

You have two options for deploying the updated server.js file:

#### Option 1: Basic Fix (Prioritize On-Demand Service)

This option updates the server.js file to prioritize the on-demand service and add more detailed logging:

1. The updated file has been created as `server.js.fix` and copied to `server.js`.

2. Rebuild and redeploy the VEXUS service with the updated server.js file.

#### Option 2: Complete Fix (Includes Direct Vertex AI Calls)

This option updates the server.js file to use the proper format for direct Vertex AI calls as a backup option:

1. The updated file has been created as `server.js.direct-fix`.

2. Copy the file to server.js:

   ```bash
   cp server.js.direct-fix server.js
   ```

3. Rebuild and redeploy the VEXUS service with the updated server.js file.

### 3. Rebuild and Redeploy

After selecting one of the options above, rebuild and redeploy the VEXUS service:

```bash
# Navigate to the VEXUS directory
cd /path/to/VEXUS

# Build the Docker image
docker build -t gcr.io/plucky-weaver-450819-k7/vexus:latest .

# Push the Docker image to Google Container Registry
docker push gcr.io/plucky-weaver-450819-k7/vexus:latest

# Deploy the updated service to Cloud Run
gcloud run deploy vexus \
  --image gcr.io/plucky-weaver-450819-k7/vexus:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Alternatively, you can use the Cloud Build configuration if available:

```bash
gcloud builds submit --config cloudbuild.yaml
```

### 4. Verify the Deployment

After deploying the updates, verify that the VEXUS system is working correctly:

1. Check the Cloud Run logs to ensure there are no errors.

2. Test the VEXUS system by uploading images and verifying that predictions are returned correctly.

3. Monitor the logs to ensure the on-demand service is being used correctly.

## Troubleshooting

If you encounter issues after deploying the fixes:

1. **Check Cloud Run Logs**: Review the logs for the VEXUS service and the on-demand endpoint service to identify any errors.

2. **Verify Environment Variables**: Ensure that all environment variables are correctly set in the Cloud Run configuration.

3. **Test the On-Demand Service Directly**: Use the test-compare-services.js script to test the on-demand service directly:

   ```bash
   node test-compare-services.js
   ```

4. **Test Direct Vertex AI Calls**: Use the test-vertex-proper-format.js script to test direct Vertex AI calls:

   ```bash
   node test-vertex-proper-format.js
   ```

5. **Check Endpoint Connectivity**: Ensure that the VEXUS service can connect to the on-demand endpoint service.

## Additional Notes

- The server now prioritizes the on-demand service, which is working correctly.

- If the on-demand service is unavailable, the server will fall back to direct Vertex AI calls using the proper format.

- The enhanced logging in the server.js file will help diagnose any future issues.

## Contact

If you have any questions or need further assistance, please contact the development team.
