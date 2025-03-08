#!/usr/bin/env python3

import requests
import base64
import json
import os
from PIL import Image
import io

print("========== SERVER DIRECT API PREDICTION TEST ==========")

# Configuration
SERVER_URL = "http://localhost:3002"
TEST_IMAGE_PATH = "/Users/gabe/VEXUS/test_image.png"
VEIN_TYPE = "hepatic"  # or "portal" or "renal"

# Load the test image
try:
    with open(TEST_IMAGE_PATH, "rb") as image_file:
        image_data = image_file.read()
        image_size = len(image_data)
        print(f"Loaded standard test image, size: {image_size} bytes")

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

# Create the payload
payload = {
    "instances": [
        {
            "content": base64_data,
            "mimeType": mime_type
        }
    ],
    "parameters": {
        "confidenceThreshold": 0.0,
        "maxPredictions": 5
    },
    "metadata": {
        "veinType": VEIN_TYPE,
        "imageType": mime_type,
        "timestamp": 123456789
    }
}

print(f"\nSending request to server direct API: {SERVER_URL}/api/predict/direct/{VEIN_TYPE}...")

# Make the request
response = requests.post(
    f"{SERVER_URL}/api/predict/direct/{VEIN_TYPE}", 
    json=payload
)

print(f"Status code: {response.status_code}")

if response.status_code == 200:
    result = response.json()
    print("Server direct API prediction successful!")
    
    print("\nPredictions:")
    if "predictions" in result and len(result["predictions"]) > 0:
        predictions = result["predictions"][0]
        display_names = predictions.get("displayNames", [])
        confidences = predictions.get("confidences", [])
        
        for i, (name, conf) in enumerate(zip(display_names, confidences)):
            if i < 3:  # Just show top 3
                print(f"  {i+1}. {name}: {conf:.2%}")
    else:
        print(json.dumps(result, indent=2))
else:
    print(f"Server direct API prediction failed!")
    try:
        error_json = response.json()
        print(f"Error: {json.dumps(error_json, indent=2)}")
    except:
        print(f"Response text: {response.text}")

print("\n========== TEST COMPLETE ==========") 