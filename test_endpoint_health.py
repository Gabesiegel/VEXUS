#!/usr/bin/env python3

import requests
import json
import base64
import os
import time
import subprocess
from datetime import datetime

print("========== ENDPOINT AND SERVICE HEALTH CHECK ==========")

# Configuration
ONDEMAND_URL = "https://endpoints-on-demand-456295042668.us-central1.run.app"
SERVER_URL = "http://localhost:3002"
ENDPOINTS = {
    "hepatic": "8159951878260523008",
    "portal": "2970410926785691648",
    "renal": "1148704877514326016"
}
PROJECT_ID = "456295042668"
LOCATION = "us-central1"

def get_access_token():
    """Get access token from gcloud"""
    try:
        print("Getting access token...")
        result = subprocess.run(
            ["gcloud", "auth", "print-access-token"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        token = result.stdout.strip()
        if token:
            print("✓ Access token obtained successfully")
            return token
        else:
            print("✗ Failed to obtain access token")
            return None
    except Exception as e:
        print(f"✗ Error getting access token: {e}")
        return None

def check_vertex_endpoint(endpoint_id, token):
    """Check if a Vertex AI endpoint is reachable and functioning"""
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{endpoint_id}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        print(f"\nChecking Vertex AI endpoint: {endpoint_id}...")
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            endpoint_info = response.json()
            print(f"✓ Endpoint is active and reachable (Status code: {response.status_code})")
            return True, endpoint_info
        else:
            print(f"✗ Endpoint check failed with status code: {response.status_code}")
            try:
                error_details = response.json()
                print(f"Error details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Response: {response.text}")
            return False, None
    except Exception as e:
        print(f"✗ Error connecting to endpoint: {e}")
        return False, None

def check_ondemand_service():
    """Check if the on-demand service is running"""
    try:
        print("\nChecking on-demand service health...")
        response = requests.get(f"{ONDEMAND_URL}/health")
        
        if response.status_code == 200:
            print(f"✓ On-demand service is up and running (Status code: {response.status_code})")
            return True
        else:
            print(f"✗ On-demand service check failed with status code: {response.status_code}")
            try:
                error_details = response.json()
                print(f"Error details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error connecting to on-demand service: {e}")
        return False

def check_server_health():
    """Check if the local server is running"""
    try:
        print("\nChecking local server status...")
        response = requests.get(f"{SERVER_URL}/")
        
        if response.status_code != 404:  # Server is running but might not have a root endpoint
            print(f"✓ Local server is running (Status code: {response.status_code})")
            return True
        else:
            print(f"✗ Local server check failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error connecting to local server: {e}")
        return False

def check_endpoint_connection(endpoint_id, token):
    """Test a direct API call to Vertex AI endpoint"""
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{endpoint_id}:predict"
    
    # Create a minimal valid payload
    payload = {
        "instances": [
            {
                "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                "mimeType": "image/png"
            }
        ],
        "parameters": {
            "confidenceThreshold": 0.0,
            "maxPredictions": 1
        }
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        print(f"\nTesting direct API connection to endpoint {endpoint_id}...")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            print(f"✓ Direct API connection successful (Status code: {response.status_code})")
            result = response.json()
            if "predictions" in result and len(result["predictions"]) > 0:
                print("✓ Got valid predictions from endpoint")
            return True
        else:
            print(f"✗ Direct API connection failed with status code: {response.status_code}")
            try:
                error_details = response.json()
                print(f"Error details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error making direct API call: {e}")
        return False

def check_ondemand_prediction():
    """Test on-demand service with a minimal prediction request"""
    url = f"{ONDEMAND_URL}/predict/hepatic"
    
    # Create a minimal valid payload for the on-demand service
    payload = {
        "instances": [
            {
                "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                "mimeType": "image/png"
            }
        ],
        "parameters": {
            "confidenceThreshold": 0.0,
            "maxPredictions": 1
        }
    }
    
    try:
        print(f"\nTesting on-demand service prediction...")
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            print(f"✓ On-demand prediction successful (Status code: {response.status_code})")
            result = response.json()
            print(f"Prediction result: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"✗ On-demand prediction failed with status code: {response.status_code}")
            try:
                error_details = response.json()
                print(f"Error details: {json.dumps(error_details, indent=2)}")
            except:
                print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error making on-demand prediction: {e}")
        return False

def main():
    # Get access token
    token = get_access_token()
    if not token:
        print("Cannot proceed without access token")
        return
    
    # Check server status
    server_status = check_server_health()

    # Check on-demand service status
    ondemand_status = check_ondemand_service()
    
    # Check endpoint status for each vein type
    endpoint_statuses = {}
    for vein_type, endpoint_id in ENDPOINTS.items():
        status, info = check_vertex_endpoint(endpoint_id, token)
        endpoint_statuses[vein_type] = status
    
    # Test direct API connection for hepatic endpoint
    api_connection = check_endpoint_connection(ENDPOINTS["hepatic"], token)
    
    # Test on-demand prediction
    ondemand_prediction = False
    if ondemand_status:
        ondemand_prediction = check_ondemand_prediction()
    
    # Summary of results
    print("\n========== SUMMARY ==========")
    print(f"Local server: {'✓ Running' if server_status else '✗ Not running'}")
    print(f"On-demand service: {'✓ Running' if ondemand_status else '✗ Not running'}")
    
    for vein_type, status in endpoint_statuses.items():
        print(f"{vein_type.capitalize()} endpoint: {'✓ Active' if status else '✗ Inactive'}")
    
    print(f"Direct API connection: {'✓ Working' if api_connection else '✗ Not working'}")
    print(f"On-demand prediction: {'✓ Working' if ondemand_prediction else '✗ Not working'}")
    
    print("\n========== RECOMMENDATIONS ==========")
    if not server_status:
        print("- Start the local server with: node server.js")
    
    if not ondemand_status or not ondemand_prediction:
        print("- Check on-demand service logs for errors")
        print("- Redeploy the on-demand service")
    
    for vein_type, status in endpoint_statuses.items():
        if not status:
            print(f"- Check the {vein_type} endpoint configuration and status")
    
    print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("==============================")

if __name__ == "__main__":
    main() 