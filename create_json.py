import base64
import json

def create_image_json(image_path, output_path):
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

        data = {
          "instances": [{
            "prompt": "a corgi wearing a top hat"
          }],
        "parameters": {
          "sampleCount": 1
        }
      }

        with open(output_path, "w") as outfile:
            json.dump(data, outfile, indent=2)

        print(f"JSON object written to {output_path}")

    except FileNotFoundError:
        print(f"Error: File not found at {image_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_image_json("test.png", "image_data.json")
