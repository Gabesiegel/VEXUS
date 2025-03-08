# VExUS System Issues Report

Based on our testing, we've identified several issues with the VExUS prediction system:

## 1. Quota Exceeded Error

The most significant issue is that your Google Cloud project has exceeded its quota for AutoML Image Classification Deployed Model Nodes:

```
"The following quotas are exceeded: AutoMLImageClassificationDeployedModelNodes"
```

### Solution Options:

1. **Request a quota increase**:
   - Go to the Google Cloud Console
   - Navigate to IAM & Admin > Quotas & System Limits
   - Search for "AutoMLImageClassificationDeployedModelNodes"
   - Select the quota and click "Edit Quotas"
   - Request an increase and provide business justification

2. **Clean up unused endpoints**:
   - The on-demand service attempts to create temporary endpoints for each prediction
   - There may be old endpoints that weren't properly cleaned up
   - Use the Google Cloud Console to identify and delete unused endpoints
   - Run the following command to list all endpoints:
     ```
     gcloud ai endpoints list --region=us-central1
     ```
   - Delete unused endpoints:
     ```
     gcloud ai endpoints delete ENDPOINT_ID --region=us-central1
     ```

3. **Modify the on-demand service to reuse endpoints**:
   - Instead of creating a new endpoint for each request, maintain a pool of endpoints
   - Implement better cleanup of inactive endpoints

## 2. Vertex AI Format Issue

The GCS URI approach for making predictions fails because the API expects base64-encoded images. The Base64 content approach works for direct Vertex AI calls.

### Solution:
- Continue using the Base64 content format that works
- The JSON format should be:
  ```json
  {
    "instances": [
      {
        "content": "BASE64_ENCODED_IMAGE_STRING_HERE"
      }
    ]
  }
  ```

## 3. Port Conflict (Fixed)

The server was failing to start because port 3002 was already in use by another process. This has been fixed by killing the process using that port.

## Next Steps

1. **Address the quota issue first**:
   - This is blocking the on-demand service from functioning properly
   - Follow the solution options under the Quota Exceeded Error section

2. **Use direct Vertex AI calls for now**:
   - While fixing the quota issue, continue using the direct Vertex AI approach which is working

3. **Update on-demand service implementation**:
   - Once quota issues are resolved, deploy the fixed version of the service
   - The fixed implementation properly handles base64 data

4. **Consider image optimization**:
   - Large images result in large base64 strings
   - Implement image resizing/optimization to reduce payload size

## Testing After Fixes

After addressing the quota issues, test the system using:

```bash
node test-ondemand-fix.js
```

This script tests the on-demand service with a smaller image and proper error handling. 