import os
import time
import json
import base64
from flask import Flask, request, jsonify
from google.cloud import aiplatform
from google.protobuf import json_format
from google.protobuf.struct_pb2 import Value
import google.auth
import google.auth.transport.requests
import threading
import logging
from collections import defaultdict
from datetime import datetime

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
PROJECT_ID = os.environ.get("PROJECT_ID", "plucky-weaver-450819-k7")
LOCATION = os.environ.get("LOCATION", "us-central1")
DEFAULT_TIMEOUT_MINUTES = int(os.environ.get("TIMEOUT_MINUTES", "15"))  # Default time before endpoint deletion
MIN_TIMEOUT_MINUTES = 5  # Minimum timeout for rarely used endpoints
MAX_TIMEOUT_MINUTES = 20  # Maximum timeout for frequently used endpoints
MAX_ENDPOINTS_PER_TYPE = 2  # Maximum number of endpoints to maintain per model type

# Dictionary to store endpoint data with creation timestamp
# Structure: {model_type: {endpoint_id: {endpoint_obj, created_at, in_use}}}
endpoints = {}

# Track usage patterns for adaptive timeouts
usage_history = defaultdict(list)  # {model_type: [timestamp1, timestamp2, ...]}
usage_window = 24 * 60 * 60  # 24 hours window for usage analysis

# Model and endpoint information
MODELS = {
    "renal": {
        "model_id": "8902680778916233216",
        "endpoint_id": "1148704877514326016",  # Correct Renal endpoint ID
        "endpoint_name": "VExUS - Renal Vein"
    },
    "portal": {
        "model_id": "6378976137728491520",
        "endpoint_id": "2970410926785691648",  # Correct Portal endpoint ID
        "endpoint_name": "VExUS - Portal Vein"
    },
    "hepatic": {
        "model_id": "6041241350047793152",
        "endpoint_id": "8159951878260523008",  # Correct Hepatic endpoint ID
        "endpoint_name": "VExUS - Hepatic Vein"
    }
}

class EndpointPool:
    """Manages a pool of endpoints for more efficient resource usage."""
    
    @staticmethod
    def get_available_endpoint(model_type):
        """Get an available endpoint for the specified model type."""
        if model_type not in endpoints:
            endpoints[model_type] = {}
            return None
        
        # Look for an existing endpoint that's not in use
        available_endpoints = [
            endpoint_id for endpoint_id, info in endpoints[model_type].items()
            if not info.get('in_use', False)
        ]
        
        if available_endpoints:
            # Get the most recently used endpoint
            endpoint_id = max(
                available_endpoints,
                key=lambda eid: endpoints[model_type][eid]['created_at']
            )
            
            # Mark as in use
            endpoints[model_type][endpoint_id]['in_use'] = True
            return endpoint_id
        
        return None
    
    @staticmethod
    def release_endpoint(model_type, endpoint_id):
        """Release an endpoint back to the pool."""
        if model_type in endpoints and endpoint_id in endpoints[model_type]:
            # Update timestamp and mark as not in use
            endpoints[model_type][endpoint_id]['created_at'] = time.time()
            endpoints[model_type][endpoint_id]['in_use'] = False
            logger.info(f"Released endpoint {endpoint_id} back to the pool")
    
    @staticmethod
    def add_endpoint(model_type, endpoint_id, endpoint_obj):
        """Add a new endpoint to the pool."""
        if model_type not in endpoints:
            endpoints[model_type] = {}
        
        endpoints[model_type][endpoint_id] = {
            "endpoint_obj": endpoint_obj,
            "created_at": time.time(),
            "in_use": True
        }
        
        # Check if we have too many endpoints of this type
        if len(endpoints[model_type]) > MAX_ENDPOINTS_PER_TYPE:
            # Find the oldest endpoint
            oldest_endpoint_id = min(
                endpoints[model_type].keys(),
                key=lambda eid: endpoints[model_type][eid]['created_at']
            )
            
            # If it's not the one we just added and not in use, delete it
            if oldest_endpoint_id != endpoint_id and not endpoints[model_type][oldest_endpoint_id]['in_use']:
                logger.info(f"Pool maintenance: removing oldest endpoint {oldest_endpoint_id}")
                EndpointPool.delete_endpoint(model_type, oldest_endpoint_id)
    
    @staticmethod
    def delete_endpoint(model_type, endpoint_id):
        """Delete an endpoint from the pool."""
        if model_type in endpoints and endpoint_id in endpoints[model_type]:
            try:
                endpoint_obj = endpoints[model_type][endpoint_id]['endpoint_obj']
                endpoint_obj.undeploy_all()
                endpoint_obj.delete()
                logger.info(f"Deleted endpoint {endpoint_id} from pool")
            except Exception as e:
                logger.error(f"Error deleting endpoint {endpoint_id}: {str(e)}")
            
            # Remove from tracking regardless of success
            del endpoints[model_type][endpoint_id]

def calculate_adaptive_timeout(model_type):
    """Calculate timeout based on usage patterns."""
    now = time.time()
    # Remove timestamps older than the window
    usage_history[model_type] = [ts for ts in usage_history[model_type] if now - ts < usage_window]
    
    # Count usages in the past window
    usage_count = len(usage_history[model_type])
    
    if usage_count < 5:
        # Rarely used - shorter timeout to save costs
        return MIN_TIMEOUT_MINUTES
    elif usage_count > 20:
        # Frequently used - longer timeout to reduce cold starts
        return MAX_TIMEOUT_MINUTES
    else:
        # Moderate usage - use default timeout
        return DEFAULT_TIMEOUT_MINUTES

def authenticate():
    """Authenticate with Google Cloud."""
    credentials, project = google.auth.default()
    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    return credentials

def check_quota_availability():
    """Check if we're approaching quota limits and take preemptive action."""
    try:
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        # Get current endpoint count
        endpoint_list = aiplatform.Endpoint.list()
        endpoint_count = len(endpoint_list)
        
        # Check if we're approaching a limit
        # Note: This is an estimation, adjust the threshold based on your quota
        ENDPOINT_QUOTA_THRESHOLD = 8  # If we have 8 or more endpoints, we might be approaching limits
        
        if endpoint_count >= ENDPOINT_QUOTA_THRESHOLD:
            logger.warning(f"Approaching endpoint quota limit. Current count: {endpoint_count}")
            
            # Find and clean up oldest endpoints managed by this service
            if endpoints:
                # Get the oldest managed endpoint
                oldest_model_type = min(endpoints.items(), key=lambda x: x[1]['created_at'])[0]
                logger.info(f"Preemptively cleaning up oldest endpoint: {oldest_model_type}")
                delete_endpoint(oldest_model_type)
                return True
            
            # If we don't manage any endpoints, look for old temporary endpoints
            old_temp_endpoints = [
                endpoint for endpoint in endpoint_list 
                if "-temp" in endpoint.display_name and 
                (time.time() - time.mktime(time.strptime(endpoint.create_time, "%Y-%m-%dT%H:%M:%S.%fZ"))) > 3600
            ]
            
            if old_temp_endpoints:
                # Delete the oldest temporary endpoint
                oldest = old_temp_endpoints[0]
                logger.info(f"Preemptively cleaning up old temporary endpoint: {oldest.display_name}")
                oldest.delete()
                return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking quota availability: {str(e)}")
        return False

def create_endpoint(model_type):
    """Create and deploy a new endpoint for the specified model type."""
    logger.info(f"Creating endpoint for {model_type}")
    
    if model_type not in MODELS:
        raise ValueError(f"Unknown model type: {model_type}")
    
    try:
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        model_info = MODELS[model_type]
        model_id = model_info["model_id"]
        endpoint_id = model_info["endpoint_id"]  # Use the fixed endpoint ID
        endpoint_name = model_info["endpoint_name"]
        
        # Try to get the existing endpoint first
        try:
            endpoint = aiplatform.Endpoint(
                endpoint_name=f"projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{endpoint_id}"
            )
            logger.info(f"Found existing endpoint {endpoint_id} for {model_type}")
            
            # Check if the endpoint has deployed models
            if hasattr(endpoint.gca_resource, 'deployed_models') and endpoint.gca_resource.deployed_models:
                logger.info(f"Endpoint {endpoint_id} already has deployed models")
                return endpoint_id
            
            logger.info(f"Endpoint {endpoint_id} exists but has no deployed models. Deploying model...")
        except Exception as e:
            logger.info(f"Endpoint {endpoint_id} not found, creating it...")
            endpoint = aiplatform.Endpoint.create(
                display_name=endpoint_name,
                endpoint_id=endpoint_id
            )
        
        # Get the model
        model = aiplatform.Model(model_name=f"projects/{PROJECT_ID}/locations/{LOCATION}/models/{model_id}")
        
        # Deploy the model to the endpoint
        try:
            model.deploy(
                endpoint=endpoint,
                machine_type="n1-standard-2",
                min_replica_count=1,
                max_replica_count=1
            )
            logger.info(f"Successfully deployed model to endpoint {endpoint_id}")
        except Exception as deploy_error:
            logger.error(f"Error deploying model to endpoint: {str(deploy_error)}")
            
            # Check for quota error
            error_msg = str(deploy_error).lower()
            if "quota" in error_msg or "exceeded" in error_msg or "limit" in error_msg:
                raise ValueError(f"Quota exceeded: {str(deploy_error)}. Please request a quota increase or clean up unused endpoints.")
            
            raise deploy_error
        
        # Add to the endpoint pool
        EndpointPool.add_endpoint(model_type, endpoint_id, endpoint)
        
        return endpoint_id
    except Exception as e:
        logger.error(f"Error creating endpoint for {model_type}: {str(e)}")
        raise

def schedule_cleanup(model_type, endpoint_id):
    """Schedule cleanup of an endpoint after the timeout period."""
    # Calculate adaptive timeout based on usage patterns
    timeout_minutes = calculate_adaptive_timeout(model_type)
    timeout_seconds = timeout_minutes * 60
    
    logger.info(f"Scheduling cleanup for {model_type} in {timeout_minutes} minutes")
    
    time.sleep(timeout_seconds)
    
    # Check if endpoint still exists and hasn't been used recently
    if model_type in endpoints and endpoint_id in endpoints[model_type]:
        current_time = time.time()
        created_at = endpoints[model_type][endpoint_id]['created_at']
        
        if current_time - created_at >= timeout_seconds:
            delete_endpoint(model_type, endpoint_id)

def delete_endpoint(model_type, endpoint_id):
    """Delete an endpoint."""
    if model_type not in endpoints or endpoint_id not in endpoints[model_type]:
        logger.info(f"No endpoint to delete for {model_type}")
        return
    
    logger.info(f"Deleting endpoint for {model_type}")
    
    try:
        endpoint_obj = endpoints[model_type][endpoint_id]['endpoint_obj']
        endpoint_obj.undeploy_all()
        endpoint_obj.delete()
        
        logger.info(f"Endpoint {endpoint_id} for {model_type} deleted")
        
        # Remove from tracking
        del endpoints[model_type][endpoint_id]
    except Exception as e:
        logger.error(f"Error deleting endpoint for {model_type}: {str(e)}")

def get_prediction(endpoint_id, instances):
    """Get prediction from an endpoint."""
    logger.info(f"Getting prediction from endpoint {endpoint_id}")
    
    endpoint = aiplatform.Endpoint(endpoint_name=f"projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{endpoint_id}")
    
    # FIXED: Properly handle base64 encoded images
    processed_instances = []
    
    for instance in instances:
        # Handle the format that works with direct Vertex AI: { content: base64string }
        if 'content' in instance and isinstance(instance['content'], str):
            # This is directly compatible with the Vertex AI format
            processed_instances.append(instance)
        else:
            # For any other format, log it and reject
            logger.error(f"Unsupported instance format: {json.dumps(instance)[:100]}...")
            raise ValueError("Unsupported instance format. Expected {content: 'base64-encoded-image'}")
    
    # Get prediction with properly formatted instances
    prediction = endpoint.predict(instances=processed_instances)
    
    return prediction

@app.route('/predict/<vein_type>', methods=['POST'])
def predict_endpoint(vein_type):
    try:
        # Parse request data
        request_data = request.get_json()
        if not request_data or 'instances' not in request_data:
            return jsonify({
                'error': 'Invalid request format',
                'message': 'Request must include instances array',
                'timestamp': datetime.now().isoformat()
            }), 400

        # Get metadata and parameters
        metadata = request_data.get('metadata', {})
        parameters = request_data.get('parameters', {
            'confidenceThreshold': 0.0,
            'maxPredictions': 5
        })

        # Validate vein type
        if vein_type not in MODELS:
            return jsonify({
                'error': 'Invalid vein type',
                'message': f'Vein type must be one of: {", ".join(MODELS.keys())}',
                'timestamp': datetime.now().isoformat()
            }), 400

        # Get endpoint ID from metadata or config
        endpoint_id = metadata.get('endpointId') or MODELS[vein_type]['endpoint_id']
        
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        try:
            # Get or create endpoint using EndpointPool
            if vein_type not in endpoints or endpoint_id not in endpoints[vein_type]:
                # Initialize the endpoint pool for this type if needed
                if vein_type not in endpoints:
                    endpoints[vein_type] = {}
                
                # Create the endpoint if it doesn't exist
                endpoint = aiplatform.Endpoint(
                    endpoint_name=f"projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{endpoint_id}"
                )
                
                # Add to pool
                EndpointPool.add_endpoint(vein_type, endpoint_id, endpoint)
            else:
                # Get existing endpoint from pool
                endpoint = endpoints[vein_type][endpoint_id]['endpoint_obj']
            
            # Track usage for adaptive timeout
            usage_history[vein_type].append(time.time())
            
            # Validate instances format
            instances = request_data['instances']
            if not isinstance(instances, list) or not instances:
                raise ValueError("Instances must be a non-empty array")
                
            processed_instances = []
            for instance in instances:
                if not isinstance(instance, dict) or 'content' not in instance:
                    raise ValueError("Each instance must be an object with 'content' field")
                
                # Get base64 content
                content = instance['content']
                
                # Remove any whitespace or newlines from base64 content
                content = content.strip().replace('\n', '').replace('\r', '')
                
                # Validate base64 format
                try:
                    # Decode base64 to check if it's valid
                    image_data = base64.b64decode(content)
                    
                    # Check file size (1.5MB limit)
                    if len(image_data) > 1.5 * 1024 * 1024:
                        raise ValueError("Image size must be less than 1.5MB")
                    
                    # Add processed instance
                    processed_instances.append({
                        'content': content
                    })
                except Exception as e:
                    raise ValueError(f"Invalid base64 image content: {str(e)}")
            
            try:
                # Make prediction with processed instances
                response = endpoint.predict(
                    instances=processed_instances,
                    parameters=parameters
                )
                
                # Extract predictions from response
                if not response.predictions or not response.predictions[0]:
                    raise ValueError("No predictions returned from model")
                
                prediction = response.predictions[0]
                
                # Format response
                result = {
                    'displayNames': prediction.get('displayNames', []),
                    'confidences': prediction.get('confidences', []),
                    'deployedModelId': response.deployed_model_id,
                    'model': response.model,
                    'modelDisplayName': response.model_display_name,
                    'modelVersionId': response.model_version_id,
                    'timestamp': datetime.now().isoformat(),
                    'status': 'success'
                }
                
                # Release endpoint back to pool
                EndpointPool.release_endpoint(vein_type, endpoint_id)
                
                return jsonify(result)
            
            except Exception as predict_error:
                # Release endpoint on error
                EndpointPool.release_endpoint(vein_type, endpoint_id)
                raise predict_error
            
        except Exception as e:
            logger.error(f"Prediction error for {vein_type} with endpoint {endpoint_id}: {str(e)}")
            return jsonify({
                'error': 'Prediction failed',
                'message': f'Failed to process request. endpoint_id: {endpoint_id}, error: {str(e)}',
                'veinType': vein_type,
                'timestamp': datetime.now().isoformat()
            }), 500

    except Exception as e:
        logger.error(f"Error in predict_endpoint for {vein_type}: {str(e)}")
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e),
            'veinType': vein_type,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    active_endpoints = {}
    
    # Collect information about all endpoints in the pool
    for model_type, model_endpoints in endpoints.items():
        active_endpoints[model_type] = []
        for endpoint_id, info in model_endpoints.items():
            active_endpoints[model_type].append({
                "endpoint_id": endpoint_id,
                "created_at": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(info["created_at"])),
                "in_use": info.get("in_use", False)
            })
    
    status = {
        "status": "healthy",
        "active_endpoints": active_endpoints,
        "usage_patterns": {
            model_type: len(timestamps) for model_type, timestamps in usage_history.items()
        }
    }
    return jsonify(status)

@app.route('/quota-check', methods=['GET'])
def quota_check():
    """Check quota status for endpoints."""
    try:
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        # Get current endpoint count
        endpoint_list = aiplatform.Endpoint.list()
        
        # Count managed endpoints
        managed_count = 0
        managed_endpoints = []
        for model_type, model_endpoints in endpoints.items():
            for endpoint_id in model_endpoints:
                managed_count += 1
                managed_endpoints.append({
                    "model_type": model_type,
                    "endpoint_id": endpoint_id,
                    "in_use": endpoints[model_type][endpoint_id].get("in_use", False)
                })
        
        # Try to create a small test endpoint to test quotas
        test_status = "NOT_TESTED"
        error_message = None
        
        try:
            # Create a test endpoint with a unique name
            test_endpoint_name = f"quota-test-{int(time.time())}"
            test_endpoint = aiplatform.Endpoint.create(display_name=test_endpoint_name)
            
            # If we get here, endpoint creation is working
            test_status = "QUOTA_AVAILABLE"
            
            # Clean up the test endpoint
            test_endpoint.delete()
        except Exception as e:
            test_status = "QUOTA_ERROR"
            error_message = str(e)
        
        # Return quota information
        return jsonify({
            "project": PROJECT_ID,
            "location": LOCATION,
            "total_endpoint_count": len(endpoint_list),
            "managed_endpoint_count": managed_count,
            "managed_endpoints": managed_endpoints,
            "all_endpoints": [
                {
                    "id": endpoint.name.split("/")[-1],
                    "display_name": endpoint.display_name,
                    "create_time": endpoint.create_time
                }
                for endpoint in endpoint_list
            ],
            "test_status": test_status,
            "error_message": error_message
        })
    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "error": str(e)
        }), 500

@app.route('/cleanup', methods=['POST'])
def cleanup_all():
    """Manually trigger cleanup of all endpoints."""
    cleanup_count = 0
    
    # Make a copy of the model types to avoid modification during iteration
    model_types = list(endpoints.keys())
    
    for model_type in model_types:
        # Make a copy of the endpoint IDs to avoid modification during iteration
        if model_type in endpoints:
            endpoint_ids = list(endpoints[model_type].keys())
            for endpoint_id in endpoint_ids:
                # Skip endpoints that are in use
                if endpoints[model_type][endpoint_id].get("in_use", False):
                    continue
                
                EndpointPool.delete_endpoint(model_type, endpoint_id)
                cleanup_count += 1
    
    return jsonify({
        "status": "success",
        "message": f"Cleaned up {cleanup_count} endpoints",
        "remaining_endpoints": {
            model_type: [
                {"id": endpoint_id, "in_use": info.get("in_use", False)}
                for endpoint_id, info in model_endpoints.items()
            ]
            for model_type, model_endpoints in endpoints.items()
        }
    })

@app.route('/ping/<vein_type>', methods=['POST'])
def ping_endpoint(vein_type):
    """Check if an endpoint is ready."""
    try:
        if vein_type not in MODELS:
            return jsonify({
                'error': f'Invalid vein type. Must be one of: {", ".join(MODELS.keys())}'
            }), 400

        # Get the request data
        request_data = request.get_json() or {}

        # Extract endpoint ID from request or use configured ID
        endpoint_id = request_data.get('endpointId') or MODELS[vein_type]['endpoint_id']
        logger.info(f"Pinging endpoint {endpoint_id} for {vein_type}")
        
        # Track usage for adaptive timeout
        now = time.time()
        usage_history[vein_type].append(now)
        
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        # Check if the endpoint exists
        try:
            endpoint = aiplatform.Endpoint(
                endpoint_name=f"projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/{endpoint_id}"
            )
            endpoint_info = endpoint.gca_resource
            
            # Check if the endpoint has deployed models
            has_models = (
                hasattr(endpoint_info, 'deployed_models') and 
                endpoint_info.deployed_models and 
                len(endpoint_info.deployed_models) > 0
            )
            
            if has_models:
                return jsonify({
                    'status': 'ready',
                    'endpoint_id': endpoint_id,
                    'display_name': endpoint_info.display_name,
                    'model_type': vein_type,
                    'deployed_models': [
                        {
                            'id': model.id,
                            'model': model.model,
                            'display_name': model.display_name
                        }
                        for model in endpoint_info.deployed_models
                    ]
                })
            else:
                # Start a thread to deploy the model in the background
                def deploy_model_background():
                    try:
                        model_id = MODELS[vein_type]['model_id']
                        model = aiplatform.Model(model_name=f"projects/{PROJECT_ID}/locations/{LOCATION}/models/{model_id}")
                        model.deploy(
                            endpoint=endpoint,
                            machine_type="n1-standard-2",
                            min_replica_count=1,
                            max_replica_count=1
                        )
                        logger.info(f"Successfully deployed model to endpoint {endpoint_id}")
                    except Exception as e:
                        logger.error(f"Background model deployment failed: {str(e)}")
                
                thread = threading.Thread(target=deploy_model_background)
                thread.daemon = True
                thread.start()
                
                return jsonify({
                    'status': 'warming',
                    'message': 'Endpoint exists but has no deployed models. Deploying model...',
                    'endpoint_id': endpoint_id,
                    'model_type': vein_type
                }), 202
                
        except Exception as e:
            logger.error(f"Error checking endpoint {endpoint_id}: {str(e)}")
            return jsonify({
                'status': 'not_ready',
                'error': f'Failed to access endpoint: {str(e)}',
                'endpoint_id': endpoint_id,
                'model_type': vein_type
            }), 404

    except Exception as e:
        logger.error(f"Error in ping endpoint: {str(e)}")
        return jsonify({
            'error': str(e),
            'model_type': vein_type
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port) 