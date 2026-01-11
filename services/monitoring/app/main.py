import sys
import os
from typing import List

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from fastapi import FastAPI, BackgroundTasks
from core.models.schema import MetricPoint

app = FastAPI(title="AegisML Monitoring Service")

_metrics_store: List[MetricPoint] = []

@app.get("/health")
async def health():
    return {"status": "ok", "service": "monitoring"}

@app.post("/metrics", status_code=201)
async def ingest_metric(metric: MetricPoint):
    _metrics_store.append(metric)
    # in real life, push to Prometheus/TimescaleDB
    return {"status": "ingested"}

@app.get("/metrics/{model_version_id}")
async def get_metrics(model_version_id: str):
    return [m for m in _metrics_store if m.model_version_id == model_version_id]

@app.get("/drift/{model_version_id}")
async def check_drift(model_version_id: str):
    # Dummy drift detection
    # If "drift_score" metric exists and is > 0.5, return alert
    drift_metrics = [m for m in _metrics_store if m.model_version_id == model_version_id and m.name == "drift_score"]
    if drift_metrics:
        latest = drift_metrics[-1]
        if latest.value > 0.5:
             return {"drift_detected": True, "score": latest.value, "severity": "high"}
    return {"drift_detected": False}
