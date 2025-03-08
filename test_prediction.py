import requests
import base64
import json
import os
import time

print("========== TESTING ON-DEMAND PREDICTION WITH PROPER SECRET MOUNTING ==========")

# Use a real image from the test_images directory
try:
    with open('/Users/gabe/VEXUS/test_images/hepatic_vein_sample1.jpg', 'rb') as f:
        image_bytes = f.read()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
    print(f"Loaded real test image, size: {len(image_bytes)} bytes")
except FileNotFoundError:
    # Fallback to a sample 1x1 pixel PNG if the real image is not available
    print("Test image not found, using fallback 1x1 pixel image")
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

# Create minimal payload
payload = {
    'instances': [
        {
            'content': base64_image,
            'mimeType': 'image/jpeg'  # Use JPEG for the real test image
        }
    ],
    'parameters': {
        'confidenceThreshold': 0.0,
        'maxPredictions': 5
    }
}

print("\n1. CHECKING ENDPOINT INFO VIA PING")
try:
    response = requests.post(
        'https://endpoints-on-demand-456295042668.us-central1.run.app/ping/hepatic',
        json={'test': 'ping'},
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    
    print(f'Status code: {response.status_code}')
    
    if response.status_code == 200:
        print('Ping successful!')
        result = response.json()
        print(f"Endpoint ID: {result.get('endpoint_id', 'unknown')}")
        print(f"Status: {result.get('status', 'unknown')}")
        print(f"Deployed models: {len(result.get('deployed_models', []))}")
    else:
        print(f'Ping failed: {response.text}')
except Exception as e:
    print(f'Ping request failed: {str(e)}')

print("\n2. TESTING PREDICTION WITH ON-DEMAND SERVICE")
try:
    response = requests.post(
        'https://endpoints-on-demand-456295042668.us-central1.run.app/predict/hepatic',
        json=payload,
        headers={'Content-Type': 'application/json'},
        timeout=30
    )
    
    print(f'Status code: {response.status_code}')
    
    if response.status_code == 200:
        print('Prediction successful!')
        result = response.json()
        
        # Display predictions if available
        if 'displayNames' in result and 'confidences' in result:
            for i, (name, confidence) in enumerate(zip(result['displayNames'][:3], result['confidences'][:3])):
                print(f"  {i+1}. {name}: {confidence*100:.2f}%")
                
            if len(result['displayNames']) > 3:
                print(f"  ... {len(result['displayNames']) - 3} more predictions")
        else:
            print(f"Response format unexpected: {json.dumps(result, indent=2)[:200]}...")
    else:
        print(f'Prediction failed: {response.text}')
except Exception as e:
    print(f'Prediction request failed: {str(e)}')

print("\n3. TESTING PREDICTION WITH DIRECT SERVER API")
try:
    server_payload = {
        'instances': [{'content': base64_image, 'mimeType': 'image/jpeg'}],
        'parameters': {'confidenceThreshold': 0.0, 'maxPredictions': 5},
        'metadata': {'veinType': 'hepatic', 'direct': True}
    }
    
    response = requests.post(
        'https://vexus-web-456295042668.us-central1.run.app/api/predict?direct=true',
        json=server_payload,
        headers={'Content-Type': 'application/json'},
        timeout=30
    )
    
    print(f'Status code: {response.status_code}')
    
    if response.status_code == 200:
        print('Direct server prediction successful!')
        result = response.json()
        
        # Display predictions if available
        if 'displayNames' in result and 'confidences' in result:
            for i, (name, confidence) in enumerate(zip(result['displayNames'][:3], result['confidences'][:3])):
                print(f"  {i+1}. {name}: {confidence*100:.2f}%")
                
            if len(result['displayNames']) > 3:
                print(f"  ... {len(result['displayNames']) - 3} more predictions")
        else:
            print(f"Response format unexpected: {json.dumps(result, indent=2)[:200]}...")
    else:
        print(f'Direct server prediction failed: {response.text}')
except Exception as e:
    print(f'Direct server prediction request failed: {str(e)}')

print("\n========== TEST COMPLETE ==========")
