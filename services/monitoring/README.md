# Monitoring Service

Collects metrics, detects anomalies, and tracks costs and latency.

Run locally:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

Endpoints:
- GET /health
- GET /metrics
