import requests
import base64
import json
import subprocess
import os

print("========== DIRECT VERTEX AI API PREDICTION TEST ==========")

# Use a standard test image from Google Cloud samples
try:
    with open('/Users/gabe/VEXUS/test_image.png', 'rb') as f:
        image_bytes = f.read()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
    print(f"Loaded standard test image, size: {len(image_bytes)} bytes")
    print(f"Note: Despite having .png extension, file command says this is a JPEG image")
except FileNotFoundError:
    # Fallback to a sample 1x1 pixel PNG if the real image is not available
    print("Standard test image not found, using fallback 1x1 pixel image")
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

# Define endpoints and project
HEPATIC_ENDPOINT_ID = "8159951878260523008"
PROJECT_ID = "456295042668"
LOCATION = "us-central1"

# Get access token
print("\nGetting access token...")
try:
    token_process = subprocess.run(
        ["gcloud", "auth", "print-access-token"], 
        capture_output=True, 
        text=True, 
        check=True
    )
    access_token = token_process.stdout.strip()
    print("Access token obtained successfully")
except subprocess.CalledProcessError as e:
    print(f"Error getting access token: {e}")
    access_token = None

if not access_token:
    print("Cannot proceed without access token")
    exit(1)

# Create payload exactly as shown in the console sample
payload = {
    "instances": [
        {
            "content": base64_image,
            "mimeType": "image/jpeg"  # The file is actually JPEG despite .png extension
        }
    ],
    "parameters": {
        "confidenceThreshold": 0.5,
        "maxPredictions": 5
    }
}

# Make request directly to Vertex AI API
print("\nMaking direct request to Vertex AI API...")
api_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{HEPATIC_ENDPOINT_ID}:predict"
print(f"URL: {api_url}")

try:
    response = requests.post(
        api_url,
        json=payload,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        timeout=30
    )
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        print("Direct API prediction successful!")
        result = response.json()
        print("\nFull response structure:")
        print(json.dumps(result, indent=2))
        
        print("\nResponse:")
        
        # Print a more readable version of the response
        if "predictions" in result:
            for i, prediction in enumerate(result["predictions"]):
                print(f"Prediction {i+1}:")
                if "displayNames" in prediction and "confidences" in prediction:
                    labels = prediction["displayNames"]
                    scores = prediction["confidences"]
                    for j, (label, score) in enumerate(zip(labels[:3], scores[:3])):
                        print(f"  {j+1}. {label}: {score*100:.2f}%")
                    
                    if len(labels) > 3:
                        print(f"  ... {len(labels) - 3} more predictions")
                else:
                    print(f"  Unexpected prediction format: {prediction}")
        else:
            print(f"Unexpected response format: {json.dumps(result, indent=2)}")
    else:
        print(f"Direct API prediction failed:")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {str(e)}")

print("\n========== TEST COMPLETE ==========") 