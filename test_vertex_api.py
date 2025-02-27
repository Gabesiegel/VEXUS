#!/usr/bin/env python3
"""
Vertex AI Prediction API Test Script
Usage: python test_vertex_api.py PROJECT_ID REGION ENDPOINT_ID
"""

import json
import sys
from google.cloud import aiplatform
from google.oauth2 import service_account
import os

def test_prediction(project_id, location, endpoint_id, input_file="input.json"):
    """Test a prediction against a Vertex AI endpoint."""
    # Initialize the Vertex AI SDK
    aiplatform.init(project=project_id, location=location)
    
    # Get the endpoint
    endpoint = aiplatform.Endpoint(endpoint_id)
    
    # Load the input data
    with open(input_file, "r") as f:
        request_data = json.load(f)
    
    # Make the prediction
    print(f"Making prediction request to endpoint: {endpoint_id}")
    print(f"Input data: {json.dumps(request_data, indent=2)}")
    print("-" * 50)
    
    try:
        response = endpoint.predict(
            instances=request_data.get("instances", []),
            parameters=request_data.get("parameters", {})
        )
        
        print("Prediction successful!")
        print(f"Response:\n{json.dumps(response.to_dict(), indent=2)}")
        return True
    except Exception as e:
        print(f"Error making prediction: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python test_vertex_api.py PROJECT_ID REGION ENDPOINT_ID")
        sys.exit(1)
    
    project_id = sys.argv[1]
    location = sys.argv[2]
    endpoint_id = sys.argv[3]
    
    test_prediction(project_id, location, endpoint_id) 