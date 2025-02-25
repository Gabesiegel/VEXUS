import base64
import json
import os
from pathlib import Path

def encode_image(image_path):
    """Encode an image file to base64."""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image {image_path}: {e}")
        return None

def create_jsonl(output_path):
    """Create a JSONL file with base64 encoded images."""
    # Define the image gallery paths
    gallery_paths = [
        'public/image_gallery/Hepatic/Normal',
        'public/image_gallery/Hepatic/Mild',
        'public/image_gallery/Hepatic/Severe',
        'public/image_gallery/Portal_Vein/Normal',
        'public/image_gallery/Portal_Vein/Mild',
        'public/image_gallery/Portal_Vein/Severe',
        'public/image_gallery/Renal/Normal',
        'public/image_gallery/Renal/Mild',
        'public/image_gallery/Renal/Severe'
    ]

    try:
        with open(output_path, 'w') as outfile:
            # Process each directory
            for gallery_path in gallery_paths:
                if not os.path.exists(gallery_path):
                    print(f"Warning: Directory {gallery_path} does not exist")
                    continue
                
                # Get all image files in the directory
                image_files = [f for f in os.listdir(gallery_path) 
                             if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
                
                for image_file in image_files:
                    image_path = os.path.join(gallery_path, image_file)
                    b64_data = encode_image(image_path)
                    
                    if b64_data:
                        # Create instance object in the format matching input.json
                        instance = {
                            "instances": [{
                                "b64": b64_data
                            }]
                        }
                        
                        # Write as a single line in JSONL format
                        json.dump(instance, outfile)
                        outfile.write('\n')
                        print(f"Processed: {image_path}")

        print(f"JSONL file created at {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_jsonl("input.jsonl")
