# On-Demand Vertex AI Endpoints

This service manages Vertex AI model endpoints on-demand, significantly reducing costs by:

1. Creating endpoints only when predictions are requested
2. Automatically deleting idle endpoints after a configurable timeout (default: 15 minutes)
3. Managing the lifecycle of multiple model endpoints

## How It Works

1. **On-Demand Creation:** When a prediction request comes in, the service checks if an endpoint exists. If not, it creates one.

2. **Auto-Cleanup:** After a period of inactivity (default: 15 minutes), the service automatically removes the endpoint.

3. **Cost Savings:** Instead of paying for endpoints 24/7, you only pay for the time they're actually in use.

## Usage

### Send a Prediction Request

```bash
curl -X POST https://endpoint-service-url/predict/renal \
  -H "Content-Type: application/json" \
  -d '{"instances": [{"input_data": "your_data_here"}]}'
```

Available model types:
- `renal`
- `portal`
- `hepatic`

### Check Service Health

```bash
curl https://endpoint-service-url/health
```

### Manually Cleanup All Endpoints

```bash
curl -X POST https://endpoint-service-url/cleanup
```

## Configuration

Environment variables:
- `TIMEOUT_MINUTES`: Minutes of inactivity before endpoint deletion (default: 15)
- `PROJECT_ID`: Google Cloud project ID
- `LOCATION`: Google Cloud region (default: us-central1)

## Deployment

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/endpoints-on-demand
gcloud run deploy endpoints-on-demand --image gcr.io/PROJECT_ID/endpoints-on-demand
```

## Cost Savings Example

**Traditional approach:**
- 3 Vertex AI endpoints running 24/7
- Cost: ~$40-100+ per endpoint per month = $120-300+ per month

**On-demand approach:**
- Endpoints running only when needed (e.g., 2 hours per day)
- Cost: ~$5-15 per endpoint per month = $15-45 per month

**Potential savings: 80-90% cost reduction** 