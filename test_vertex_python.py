#!/usr/bin/env python3

"""
Test script to verify the Python approach for Vertex AI prediction

This script uses the same approach as the on-demand service, which is working correctly.
"""

import os
import base64
import json
from google.cloud import aiplatform
import google.auth

# Configuration
CONFIG = {
    "project_id": "plucky-weaver-450819-k7",
    "project_number": "456295042668",
    "location": "us-central1",
    "endpoint_ids": {
        "hepatic": "8159951878260523008",  # VExUS - Hepatic Vein
        "portal": "2970410926785691648",    # VExUS - Portal Vein
        "renal": "1148704877514326016"      # VExUS - Renal Vein
    }
}

def get_credentials():
    """Get credentials using Application Default Credentials."""
    print(f"Getting credentials using Application Default Credentials")
    
    # Use Application Default Credentials
    credentials, project = google.auth.default()
    
    return credentials

def get_base64_image(file_path):
    """Get base64 encoded image from file."""
    print(f"Reading image from {file_path}")
    
    with open(file_path, "rb") as image_file:
        image_data = image_file.read()
        base64_data = base64.b64encode(image_data).decode("utf-8")
    
    print(f"Image loaded, base64 length: {len(base64_data)}")
    
    return base64_data

def predict_image(base64_image, vein_type="hepatic"):
    """Predict image using the endpoint approach."""
    print(f"Predicting image for {vein_type} vein using Python endpoint approach")
    
    # Initialize Vertex AI with credentials
    credentials = get_credentials()
    aiplatform.init(project=CONFIG["project_id"], location=CONFIG["location"], credentials=credentials)
    
    # Get the endpoint ID for the specified vein type
    endpoint_id = CONFIG["endpoint_ids"][vein_type]
    endpoint_path = f"projects/{CONFIG['project_number']}/locations/{CONFIG['location']}/endpoints/{endpoint_id}"
    
    print(f"Using endpoint: {endpoint_path}")
    
    # Clean the base64 string - remove any whitespace or newlines
    clean_base64 = base64_image.strip().replace("\n", "").replace("\r", "").replace(" ", "")
    
    # Create an endpoint object
    endpoint = aiplatform.Endpoint(endpoint_name=endpoint_path)
    
    # Build the instances array
    instances = [
        {
            "content": clean_base64
        }
    ]
    
    # Build the parameters object
    parameters = {
        "confidenceThreshold": 0.0,
        "maxPredictions": 5
    }
    
    print("Sending prediction request with payload structure:")
    print(json.dumps({
        "instances": [{"content": f"[BASE64 DATA - {len(clean_base64)} chars]"}],
        "parameters": parameters
    }, indent=2))
    
    # Make the prediction request
    print("Making prediction request...")
    response = endpoint.predict(instances=instances, parameters=parameters)
    
    print("Prediction response:")
    print(response)
    
    return response

def main():
    """Main function."""
    print("=== Testing Vertex AI Prediction with Python Endpoint Approach ===")
    
    try:
        # Get the test image
        test_image_path = os.path.join(os.getcwd(), "public", "test_hepatic.png")
        base64_image = get_base64_image(test_image_path)
        
        # Test with hepatic vein
        response = predict_image(base64_image, "hepatic")
        
        print("\n=== Test completed successfully ===")
        
    except Exception as e:
        print(f"Error in main function: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n=== Test failed ===")

if __name__ == "__main__":
    main()
