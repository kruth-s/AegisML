# Deployment Service

Manages inference endpoints and rollout strategies (canary, blue-green, A/B testing).

Run locally:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

Endpoints:
- GET /health
- GET /deployments
