#!/usr/bin/env python3

import requests
import json
import subprocess
import time

# Configuration
PROJECT_ID = "456295042668"
LOCATION = "us-central1"
ENDPOINT_ID = "8159951878260523008"

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

def make_prediction(token, retries=5, delay=2):
    """Make prediction with retry logic"""
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{ENDPOINT_ID}:predict"
    
    # Very simple 1x1 pixel transparent PNG
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
    
    for attempt in range(1, retries + 1):
        try:
            print(f"Attempt {attempt}/{retries}...")
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 200:
                return response.json()
            
            # Print error details
            if response.status_code >= 400:
                try:
                    error = response.json()
                    print(f"Error details: {json.dumps(error, indent=2)}")
                except:
                    print(f"Error response: {response.text}")
            
            # If not successful and we have more retries, wait and then try again
            if attempt < retries:
                wait_time = delay * attempt
                print(f"Waiting {wait_time} seconds before retrying...")
                time.sleep(wait_time)
            
        except Exception as e:
            print(f"Error during request: {e}")
            if attempt < retries:
                wait_time = delay * attempt
                print(f"Waiting {wait_time} seconds before retrying...")
                time.sleep(wait_time)
    
    return None

def main():
    print("========== DIRECT API TEST WITH RETRIES ==========")
    
    # Get access token
    token = get_access_token()
    
    # Make prediction with retries
    result = make_prediction(token)
    
    if result:
        print("\nSuccessful prediction!")
        print(json.dumps(result, indent=2))
    else:
        print("\nAll prediction attempts failed!")
    
    print("\n========== TEST COMPLETE ==========")

if __name__ == "__main__":
    main() 