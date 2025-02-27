import base64
import json
import sys
from pathlib import Path

def image_to_base64(image_path):
    """Convert an image file to base64 string."""
    try:
        with open(image_path, 'rb') as image_file:
            # Read the binary data and encode to base64
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
        sys.exit(1)

def create_json(image_path, output_path):
    """Create a properly formatted JSON file with base64 encoded image data."""
    try:
        # Validate input file exists
        if not Path(image_path).is_file():
            print(f"Error: Image file not found: {image_path}")
            sys.exit(1)
        
        # Convert image to base64
        print(f"Reading image from: {image_path}")
        b64_data = image_to_base64(image_path)
        print(f"Successfully encoded image to base64 ({len(b64_data)} bytes)")
        
        # Create the properly formatted JSON structure
        data = {
            "instances": [
                {
                    "content": b64_data
                }
            ],
            "parameters": {
                "confidenceThreshold": 0.0,
                "maxPredictions": 5
            }
        }

        # Write to output file with proper formatting
        with open(output_path, 'w') as outfile:
            json.dump(data, outfile, indent=2)
        print(f"Successfully created JSON file at: {output_path}")
        
        # Validate the output file
        with open(output_path, 'r') as infile:
            loaded = json.load(infile)
            content_length = len(loaded["instances"][0]["content"])
            print(f"Validated JSON file. Content length: {content_length}")
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def main():
    """Main function with usage instructions."""
    if len(sys.argv) != 3:
        print("\nUsage: python create_json.py <image_path> <output_json_path>")
        print("\nExample:")
        print("  python create_json.py test_image.png input.json")
        print("\nThis script will:")
        print("1. Read the image file")
        print("2. Convert it to base64")
        print("3. Create a properly formatted JSON file for the API")
        sys.exit(1)
    
    image_file = sys.argv[1]
    output_file = sys.argv[2]
    create_json(image_file, output_file)

if __name__ == "__main__":
    main()
