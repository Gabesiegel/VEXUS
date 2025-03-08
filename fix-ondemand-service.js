#!/usr/bin/env node

/**
 * Script to fix the on-demand endpoint service
 * 
 * This script makes the necessary changes to the main.py file in the
 * endpoints-on-demand directory to fix the issues with the on-demand service.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the main.py file
const mainPyPath = path.join(__dirname, 'endpoints-on-demand', 'main.py');

// Function to fix the main.py file
async function fixMainPy() {
    try {
        console.log(`Reading ${mainPyPath}...`);
        const mainPy = await fs.readFile(mainPyPath, 'utf8');
        
        // Make the necessary changes to the main.py file
        
        // 1. Fix the get_prediction function to handle the correct format
        let updatedMainPy = mainPy.replace(
            /def get_prediction\(endpoint_id, instances\):[\s\S]*?processed_instances = \[\][\s\S]*?for instance in instances:[\s\S]*?if 'content' in instance[\s\S]*?processed_instances\.append\(instance\)[\s\S]*?else:[\s\S]*?logger\.error[\s\S]*?raise ValueError[\s\S]*?prediction = endpoint\.predict\(instances=processed_instances\)/g,
            `def get_prediction(endpoint_id, instances):
    """Get prediction from an endpoint."""
    logger.info(f"Getting prediction from endpoint {endpoint_id}")
    
    endpoint = aiplatform.Endpoint(endpoint_name=f"projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{endpoint_id}")
    
    # Process instances to ensure correct format
    processed_instances = []
    
    for instance in instances:
        # Handle the correct Vertex AI format: { content: base64string }
        if 'content' in instance:
            if isinstance(instance['content'], str):
                # Clean up any whitespace in the base64 string
                clean_content = instance['content'].strip().replace('\\n', '').replace('\\r', '').replace(' ', '')
                processed_instances.append({
                    'content': clean_content
                })
            else:
                logger.error(f"Unsupported content format: {json.dumps(instance)[:100]}...")
                raise ValueError("Unsupported content format. Expected {content: 'base64-encoded-image'}")
        else:
            # For any other format, log it and reject
            logger.error(f"Unsupported instance format: {json.dumps(instance)[:100]}...")
            raise ValueError("Unsupported instance format. Expected {content: 'base64-encoded-image'}")
    
    # Get prediction with properly formatted instances
    prediction = endpoint.predict(instances=processed_instances)`
        );
        
        // 2. Fix the predict_endpoint function to handle whitespace in base64 content
        updatedMainPy = updatedMainPy.replace(
            /content = content\.strip\(\)\.replace\('\\n', ''\)\.replace\('\\r', ''\)/g,
            `content = content.strip().replace('\\n', '').replace('\\r', '').replace(' ', '')`
        );
        
        // 3. Add more detailed logging
        updatedMainPy = updatedMainPy.replace(
            /logger\.error\(f"Prediction error for {vein_type} with endpoint {endpoint_id}: {str\(e\)}"\)/g,
            `logger.error(f"Prediction error for {vein_type} with endpoint {endpoint_id}: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'code'):
                logger.error(f"Error code: {e.code}")
            if hasattr(e, 'details'):
                logger.error(f"Error details: {e.details}")
            if hasattr(e, 'metadata'):
                logger.error(f"Error metadata: {e.metadata}")`
        );
        
        // 4. Add a new endpoint for testing
        updatedMainPy = updatedMainPy.replace(
            /@app\.route\('\/health', methods=\['GET'\]\)/g,
            `@app.route('/test', methods=['POST'])
def test_endpoint():
    """Test endpoint for debugging."""
    try:
        # Parse request data
        request_data = request.get_json()
        if not request_data:
            return jsonify({
                'error': 'Invalid request format',
                'message': 'Request must include data',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Log the request data for debugging
        logger.info(f"Test endpoint request data: {json.dumps(request_data)[:1000]}")
        
        # Return success
        return jsonify({
            'status': 'ok',
            'message': 'Test endpoint working',
            'timestamp': datetime.now().isoformat(),
            'request_data': request_data
        })
    except Exception as e:
        logger.error(f"Error in test endpoint: {str(e)}")
        return jsonify({
            'error': 'Test failed',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/health', methods=['GET'])`
        );
        
        // Write the updated main.py file
        console.log(`Writing updated main.py to ${mainPyPath}.fix...`);
        await fs.writeFile(`${mainPyPath}.fix`, updatedMainPy);
        
        console.log(`Successfully created ${mainPyPath}.fix`);
        console.log(`To apply the fix, run: cp ${mainPyPath}.fix ${mainPyPath}`);
        
        return true;
    } catch (error) {
        console.error(`Error fixing main.py:`, error);
        return false;
    }
}

// Main function
async function main() {
    try {
        console.log("=== Fixing On-Demand Endpoint Service ===");
        
        // Fix the main.py file
        const success = await fixMainPy();
        
        if (success) {
            console.log("\n=== Fix completed successfully ===");
            console.log("The fix has been written to endpoints-on-demand/main.py.fix");
            console.log("To apply the fix, you need to:");
            console.log("1. Review the changes in endpoints-on-demand/main.py.fix");
            console.log("2. Copy the fixed file to replace the original:");
            console.log("   cp endpoints-on-demand/main.py.fix endpoints-on-demand/main.py");
            console.log("3. Rebuild and redeploy the on-demand service");
        } else {
            console.log("\n=== Fix failed ===");
            console.log("Please check the error messages above and try again.");
        }
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

// Run the main function
main().catch(err => {
    console.error("Unhandled error:", err);
});
