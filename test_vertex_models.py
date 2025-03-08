#!/usr/bin/env python3

import json
import requests
import subprocess

# Configuration
PROJECT_ID = "456295042668"
LOCATION = "us-central1"

print("========== VERTEX AI MODELS LIST ==========")

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

# Get access token
token = get_access_token()

# List models
print("\nListing Vertex AI models...")
models_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/models"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

try:
    response = requests.get(models_url, headers=headers)
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("✓ Models listing successful!")
        
        if "models" in result and len(result["models"]) > 0:
            print(f"\nFound {len(result['models'])} models:")
            for i, model in enumerate(result["models"]):
                print(f"\nModel {i+1}:")
                print(f"  Name: {model.get('displayName', 'N/A')}")
                print(f"  ID: {model['name'].split('/')[-1]}")
                print(f"  Create Time: {model.get('createTime', 'N/A')}")
                print(f"  Update Time: {model.get('updateTime', 'N/A')}")
                if "deployedModels" in model:
                    print(f"  Deployed Model Count: {len(model['deployedModels'])}")
                    for j, deployed in enumerate(model['deployedModels']):
                        print(f"    Deployment {j+1}:")
                        print(f"      ID: {deployed.get('id', 'N/A')}")
                        print(f"      Endpoint: {deployed.get('endpoint', 'N/A').split('/')[-1] if 'endpoint' in deployed else 'N/A'}")
        else:
            print("No models found in this project and location.")
    else:
        print("✗ Models listing failed")
        try:
            error = response.json()
            print(f"Error details: {json.dumps(error, indent=2)}")
        except:
            print(f"Error response: {response.text}")
except Exception as e:
    print(f"Request error: {e}")

# List endpoints
print("\nListing Vertex AI endpoints...")
endpoints_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints"

try:
    response = requests.get(endpoints_url, headers=headers)
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("✓ Endpoints listing successful!")
        
        if "endpoints" in result and len(result["endpoints"]) > 0:
            print(f"\nFound {len(result['endpoints'])} endpoints:")
            for i, endpoint in enumerate(result["endpoints"]):
                print(f"\nEndpoint {i+1}:")
                print(f"  Name: {endpoint.get('displayName', 'N/A')}")
                print(f"  ID: {endpoint['name'].split('/')[-1]}")
                print(f"  Create Time: {endpoint.get('createTime', 'N/A')}")
                print(f"  Update Time: {endpoint.get('updateTime', 'N/A')}")
                if "deployedModels" in endpoint:
                    print(f"  Deployed Models:")
                    for j, deployed in enumerate(endpoint['deployedModels']):
                        print(f"    Model {j+1}:")
                        print(f"      ID: {deployed.get('id', 'N/A')}")
                        print(f"      Model ID: {deployed.get('model', 'N/A').split('/')[-1] if 'model' in deployed else 'N/A'}")
                        print(f"      Display Name: {deployed.get('displayName', 'N/A')}")
        else:
            print("No endpoints found in this project and location.")
    else:
        print("✗ Endpoints listing failed")
        try:
            error = response.json()
            print(f"Error details: {json.dumps(error, indent=2)}")
        except:
            print(f"Error response: {response.text}")
except Exception as e:
    print(f"Request error: {e}")

print("\n========== TEST COMPLETE ==========") 