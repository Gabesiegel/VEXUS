#!/usr/bin/env python3

import json
import base64
import requests
import subprocess
import os
from PIL import Image
import io

# Configuration
PROJECT_ID = "456295042668" 
LOCATION = "us-central1"
MODEL_ID = "6041241350047793152"  # Model ID (not endpoint ID)
TEST_IMAGE_PATH = "/Users/gabe/VEXUS/test_image.png"

print("========== VERTEX AI DIRECT MODEL TEST ==========")

def get_access_token():
    """Get access token from gcloud"""
    print("Getting access token...")
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"], 
        capture_output=True, 
        text=True, 
        check=True
    )
    token = result.stdout.strip()
    print("✓ Access token obtained successfully")
    return token

# Load the test image
try:
    with open(TEST_IMAGE_PATH, "rb") as image_file:
        image_data = image_file.read()
        image_size = len(image_data)
        print(f"Loaded test image, size: {image_size} bytes")

        # Check the actual image type regardless of extension
        img = Image.open(io.BytesIO(image_data))
        mime_type = f"image/{img.format.lower()}"
        print(f"Image format detected: {img.format} (MIME type: {mime_type})")

        # Convert to base64
        base64_data = base64.b64encode(image_data).decode("utf-8")
except FileNotFoundError:
    print(f"Test image not found at {TEST_IMAGE_PATH}. Using fallback.")
    # Create a simple 1x1 pixel PNG as fallback
    img = Image.new('RGB', (1, 1), color = 'white')
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    base64_data = base64.b64encode(buffered.getvalue()).decode("utf-8")
    mime_type = "image/png"
    print("Created fallback 1x1 pixel image")

# Get access token
token = get_access_token()

# Try direct model prediction (not endpoint)
print("\nMaking direct Vertex AI model prediction (bypassing endpoint)...")
model_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/models/{MODEL_ID}:predict"

# Different request formats to try
formats_to_try = [
    # Format 1: Standard format with mimeType
    {
        "instances": [
            {
                "content": base64_data,
                "mimeType": mime_type
            }
        ]
    },
    # Format 2: No mimeType
    {
        "instances": [
            {
                "content": base64_data
            }
        ]
    },
    # Format 3: Raw base64 in array format
    {
        "instances": [[base64_data]]
    },
    # Format 4: Content in array format
    {
        "instances": [[{"b64": base64_data}]]
    }
]

# Try each format
for i, payload in enumerate(formats_to_try):
    print(f"\nTrying request format {i+1}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(model_url, headers=headers, json=payload)
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Prediction successful!")
            print("Response:")
            print(json.dumps(result, indent=2))
            print(f"\nFormat {i+1} worked!")
            break
        else:
            print("✗ Prediction failed")
            try:
                error = response.json()
                print(f"Error details: {json.dumps(error, indent=2)}")
            except:
                print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Request error: {e}")

print("\n========== TEST COMPLETE ==========") 