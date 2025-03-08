import requests
import base64
import json

print("========== ON-DEMAND SERVICE PREDICTION TEST ==========")

# Use the standard test image
try:
    with open('/Users/gabe/VEXUS/test_image.png', 'rb') as f:
        image_bytes = f.read()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
    print(f"Loaded standard test image, size: {len(image_bytes)} bytes")
except FileNotFoundError:
    print("Standard test image not found, using fallback 1x1 pixel image")
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

# Create payload for on-demand service
payload = {
    "instances": [
        {
            "content": base64_image,
            "mimeType": "image/jpeg"
        }
    ],
    "parameters": {
        "confidenceThreshold": 0.0,
        "maxPredictions": 5
    }
}

print("\nSending request to on-demand service...")
try:
    response = requests.post(
        "https://endpoints-on-demand-456295042668.us-central1.run.app/predict/hepatic",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        print("On-demand prediction successful!")
        result = response.json()
        
        # Display predictions if available
        if "displayNames" in result and "confidences" in result:
            print("\nPredictions:")
            for i, (name, confidence) in enumerate(zip(result["displayNames"][:3], result["confidences"][:3])):
                print(f"  {i+1}. {name}: {confidence*100:.2f}%")
                
            if len(result["displayNames"]) > 3:
                print(f"  ... {len(result['displayNames']) - 3} more predictions")
        else:
            print(f"Unexpected response format: {json.dumps(result, indent=2)}")
    else:
        print(f"On-demand prediction failed: {response.text}")
except Exception as e:
    print(f"Request failed: {str(e)}")

print("\n========== TEST COMPLETE ==========") 