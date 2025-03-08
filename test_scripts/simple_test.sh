#!/bin/bash

# Simple script to test the prediction API with minimal data
# This test doesn't require actual images

echo "Testing /api/predict endpoint with minimal test data..."

# Create a minimal test payload with a tiny base64 encoded image-like data
# This is just for testing the API functionality, not actual prediction quality
PAYLOAD=$(cat <<EOF
{
  "instances": [
    {
      "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "mimeType": "image/png"
    }
  ],
  "parameters": {
    "confidenceThreshold": 0.0,
    "maxPredictions": 5
  },
  "metadata": {
    "veinType": "hepatic",
    "imageType": "image/png",
    "timestamp": $(date +%s000),
    "onlyOnDemand": true,
    "test": true
  }
}
EOF
)

# Make the request and save response
echo "Sending test request to prediction API..."
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  http://localhost:3002/api/predict)

# Check if response contains error
if [[ "$RESPONSE" == *"error"* ]]; then
  echo "Test failed. Error response:"
  echo "$RESPONSE" | grep -o '"error":"[^"]*"'
  echo "$RESPONSE" | grep -o '"message":"[^"]*"'
  exit 1
else
  echo "Test succeeded! Response:"
  echo "$RESPONSE" | grep -o '"method":"[^"]*"'
  
  # Try to extract prediction info if available
  if [[ "$RESPONSE" == *"displayNames"* ]]; then
    echo "Predictions received (this is just a test, predictions may not be meaningful):"
    echo "$RESPONSE" | grep -o '"displayNames":\[[^]]*\]'
  else
    echo "No predictions in response (expected for test data)"
  fi
fi

echo -e "\nTesting complete!" 