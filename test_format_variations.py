#!/usr/bin/env python3

import json
import base64
import requests
import subprocess
import os
import io
import time
from PIL import Image
from datetime import datetime
import random
import sys

print("========== VERTEX AI FORMAT TESTING SUITE ==========")
print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# Configuration
PROJECT_ID = "456295042668"
LOCATION = "us-central1"
ENDPOINT_ID = "8159951878260523008"
ONDEMAND_URL = f"https://endpoints-on-demand-456295042668.us-central1.run.app/predict/hepatic"
DIRECT_API_URL = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{ENDPOINT_ID}:predict"
TEST_IMAGES_DIR = "/Users/gabe/VEXUS/test_images"
RESULTS_FILE = "/Users/gabe/VEXUS/format_test_results.json"

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

def create_test_images():
    """Create a variety of test images"""
    images = {}
    
    # 1. Create a 1x1 pixel white PNG
    print("Creating test images of various formats and sizes...")
    img = Image.new('RGB', (1, 1), color = (255, 255, 255))
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    images["white_1x1_png"] = {
        "data": base64.b64encode(buffered.getvalue()).decode('utf-8'),
        "mime_type": "image/png",
        "size": (1, 1),
        "description": "1x1 white pixel PNG"
    }
    
    # 2. Create a 10x10 gradient PNG
    img = Image.new('RGB', (10, 10))
    for x in range(10):
        for y in range(10):
            img.putpixel((x, y), (x*25, y*25, 100))
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    images["gradient_10x10_png"] = {
        "data": base64.b64encode(buffered.getvalue()).decode('utf-8'),
        "mime_type": "image/png",
        "size": (10, 10),
        "description": "10x10 gradient PNG"
    }
    
    # 3. Create a 100x100 blue JPEG
    img = Image.new('RGB', (100, 100), color = (0, 0, 200))
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=90)
    images["blue_100x100_jpeg"] = {
        "data": base64.b64encode(buffered.getvalue()).decode('utf-8'),
        "mime_type": "image/jpeg",
        "size": (100, 100),
        "description": "100x100 blue JPEG"
    }
    
    # 4. Load an actual test image if available
    try:
        actual_image_path = "/Users/gabe/VEXUS/test_image.png"
        if os.path.exists(actual_image_path):
            with open(actual_image_path, "rb") as image_file:
                image_data = image_file.read()
                img = Image.open(io.BytesIO(image_data))
                images["actual_image"] = {
                    "data": base64.b64encode(image_data).decode('utf-8'),
                    "mime_type": f"image/{img.format.lower()}",
                    "size": img.size,
                    "description": f"Actual test image ({img.size[0]}x{img.size[1]} {img.format})"
                }
                print(f"✓ Loaded actual image: {images['actual_image']['description']}")
    except Exception as e:
        print(f"Error loading actual image: {e}")
    
    print(f"✓ Created {len(images)} test images")
    return images

def load_image(path):
    """Load an image from a file path"""
    try:
        with open(path, "rb") as image_file:
            data = image_file.read()
            img = Image.open(io.BytesIO(data))
            return {
                "data": base64.b64encode(data).decode('utf-8'),
                "mime_type": f"image/{img.format.lower()}",
                "size": img.size,
                "description": f"Loaded from {path} ({img.size[0]}x{img.size[1]} {img.format})"
            }
    except Exception as e:
        print(f"Error loading image {path}: {e}")
        return None

def create_request_formats(image_info):
    """Create a variety of request formats to test"""
    formats = []
    
    # 1. Standard format with mimeType field
    formats.append({
        "name": "standard_with_mimetype",
        "description": "Standard format with mimeType field",
        "payload": {
            "instances": [
                {
                    "content": image_info["data"],
                    "mimeType": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 2. With mime type as lowercase
    formats.append({
        "name": "lowercase_mimetype",
        "description": "With mimetype field lowercase",
        "payload": {
            "instances": [
                {
                    "content": image_info["data"],
                    "mimetype": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 3. Without mimeType field
    formats.append({
        "name": "no_mimetype",
        "description": "Without mimeType field",
        "payload": {
            "instances": [
                {
                    "content": image_info["data"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 4. Without parameters field
    formats.append({
        "name": "no_parameters",
        "description": "Without parameters field",
        "payload": {
            "instances": [
                {
                    "content": image_info["data"],
                    "mimeType": image_info["mime_type"]
                }
            ]
        }
    })
    
    # 5. With imageBytes instead of content
    formats.append({
        "name": "imageBytes_field",
        "description": "With imageBytes field instead of content",
        "payload": {
            "instances": [
                {
                    "imageBytes": image_info["data"],
                    "mimeType": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 6. With b64 field instead of content
    formats.append({
        "name": "b64_field",
        "description": "With b64 field instead of content",
        "payload": {
            "instances": [
                {
                    "b64": image_info["data"],
                    "mimeType": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 7. With image field instead of content
    formats.append({
        "name": "image_field",
        "description": "With image field instead of content",
        "payload": {
            "instances": [
                {
                    "image": {
                        "content": image_info["data"],
                        "mimeType": image_info["mime_type"]
                    }
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 8. Directly in instances array (no nested object)
    formats.append({
        "name": "direct_in_instances",
        "description": "Content directly in instances array",
        "payload": {
            "instances": [image_info["data"]],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 9. Different parameter names
    formats.append({
        "name": "different_params",
        "description": "With different parameter names",
        "payload": {
            "instances": [
                {
                    "content": image_info["data"],
                    "mimeType": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidence_threshold": 0.0,
                "max_predictions": 5
            }
        }
    })
    
    # 10. With dataType field
    formats.append({
        "name": "with_dataType",
        "description": "With dataType field",
        "payload": {
            "instances": [
                {
                    "content": image_info["data"],
                    "mimeType": image_info["mime_type"],
                    "dataType": "image"
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 11. With data URI prefix (common in browser uploads)
    formats.append({
        "name": "data_uri_prefix",
        "description": "With data URI prefix",
        "payload": {
            "instances": [
                {
                    "content": f"data:{image_info['mime_type']};base64,{image_info['data']}",
                    "mimeType": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 12. Wrapped in a list format (e.g., [[data]])
    formats.append({
        "name": "nested_array",
        "description": "Content wrapped in nested array",
        "payload": {
            "instances": [[
                {
                    "content": image_info["data"],
                    "mimeType": image_info["mime_type"]
                }
            ]],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 13. Byteslist format (used in some TF serving models)
    formats.append({
        "name": "byteslist_format",
        "description": "Using byteslist format",
        "payload": {
            "instances": [
                {
                    "image_bytes": {
                        "b64": image_info["data"]
                    },
                    "mimeType": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })
    
    # 14. Single image format - just the payload with no instances
    formats.append({
        "name": "single_image_format",
        "description": "Single image format without instances array",
        "payload": {
            "content": image_info["data"],
            "mimeType": image_info["mime_type"],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }
    })

    # 15. With explicit content type in metadata
    formats.append({
        "name": "with_metadata",
        "description": "With explicit content type in metadata",
        "payload": {
            "instances": [
                {
                    "content": image_info["data"],
                    "mimeType": image_info["mime_type"]
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            },
            "metadata": {
                "imageType": image_info["mime_type"],
                "timestamp": int(time.time() * 1000)
            }
        }
    })
    
    return formats

def test_format(format_info, image_info, token, endpoint_url):
    """Test a specific request format"""
    print(f"\n--- Testing format: {format_info['name']} ---")
    print(f"Description: {format_info['description']}")
    print(f"Image: {image_info['description']}")
    print(f"Endpoint: {endpoint_url}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            endpoint_url, 
            headers=headers, 
            json=format_info['payload'],
            timeout=20
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ SUCCESS!")
            try:
                result = response.json()
                if "predictions" in result and len(result["predictions"]) > 0:
                    prediction = result["predictions"][0]
                    if "displayNames" in prediction and "confidences" in prediction:
                        print("Top predictions:")
                        for i, (name, conf) in enumerate(zip(prediction["displayNames"], prediction["confidences"])):
                            if i < 3:  # Just show top 3
                                print(f"  {i+1}. {name}: {conf:.2%}")
                    else:
                        print(f"Prediction format: {prediction.keys()}")
                else:
                    print(f"Response format: {result.keys()}")
                return True, result
            except Exception as e:
                print(f"Error parsing response: {e}")
                print(f"Response text: {response.text[:200]}...")
                return True, response.text
        else:
            print("✗ FAILED")
            try:
                error = response.json()
                print(f"Error details: {json.dumps(error, indent=2)}")
            except:
                print(f"Error response: {response.text[:200]}...")
            return False, None
    except Exception as e:
        print(f"Request error: {e}")
        return False, None

def main():
    # Create test images
    test_images = create_test_images()
    
    # Get access token
    token = get_access_token()
    
    # Select which image to test with
    selected_image_key = "actual_image" if "actual_image" in test_images else next(iter(test_images))
    selected_image = test_images[selected_image_key]
    
    # Create request formats
    formats = create_request_formats(selected_image)
    
    # Test direct API endpoint
    print("\n========== TESTING DIRECT VERTEX AI ENDPOINT ==========")
    successful_formats_direct = []
    
    for fmt in formats:
        success, _ = test_format(fmt, selected_image, token, DIRECT_API_URL)
        if success:
            successful_formats_direct.append(fmt["name"])
        time.sleep(2)  # Small delay between requests
    
    # Test on-demand service
    print("\n========== TESTING ON-DEMAND SERVICE ENDPOINT ==========")
    successful_formats_ondemand = []
    
    for fmt in formats:
        success, _ = test_format(fmt, selected_image, token, ONDEMAND_URL)
        if success:
            successful_formats_ondemand.append(fmt["name"])
        time.sleep(2)  # Small delay between requests
    
    # Summary
    print("\n========== SUMMARY ==========")
    print(f"Total formats tested: {len(formats)}")
    print(f"Successful with direct endpoint: {len(successful_formats_direct)}/{len(formats)}")
    print(f"Successful with on-demand service: {len(successful_formats_ondemand)}/{len(formats)}")
    
    print("\nSuccessful formats with direct endpoint:")
    for fmt in successful_formats_direct:
        print(f"✓ {fmt}")
    
    print("\nSuccessful formats with on-demand service:")
    for fmt in successful_formats_ondemand:
        print(f"✓ {fmt}")
    
    # Write successful formats to file for reference
    with open("successful_formats.json", "w") as f:
        json.dump({
            "direct_api": successful_formats_direct,
            "on_demand": successful_formats_ondemand,
            "timestamp": time.time(),
            "endpoint_id": ENDPOINT_ID,
            "image_info": {
                "description": selected_image["description"],
                "size": selected_image["size"],
                "mime_type": selected_image["mime_type"]
            }
        }, f, indent=2)
    
    print("\nSuccessful formats saved to successful_formats.json")
    print("\n========== TEST COMPLETE ==========")

if __name__ == "__main__":
    main() 