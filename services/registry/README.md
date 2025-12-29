# Registry Service

Stores model metadata, versions, artifacts, and lineage.

Run locally:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Endpoints:
- GET /health
- GET /models
