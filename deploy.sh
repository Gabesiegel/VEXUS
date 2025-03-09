#!/bin/bash

# Save the current timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Create backup of current server.js
echo "Creating backup of server.js as server.js.${TIMESTAMP}"
cp server.js "server.js.${TIMESTAMP}"

# Commit the changes
echo "Committing changes to git..."
git add server.js
git commit -m "Fix endpoint timeout issues and logging errors

- Enhanced retry mechanism with longer timeouts (60s) and improved backoff
- Better handling of timeout errors with special retry logic
- Fixed fs.appendFileSync error by using proper fs promises API
- Added endpoint status tracking to prevent endpoint conflicts
- Improved coordination between prewarming and actual prediction requests"

# Push the changes to the repository
echo "Pushing changes to repository..."
git push origin main

# Trigger a build on Google Cloud Build
echo "Triggering build on Google Cloud Build..."
gcloud builds submit --config=cloudbuild.yaml .

echo "Deployment initiated. Check Cloud Build logs for progress." 