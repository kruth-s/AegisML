import sys
import os
import random
import uuid
from typing import List, Dict

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from fastapi import FastAPI, HTTPException, BackgroundTasks
from core.models.schema import EvaluationResult, EvaluationMetric

app = FastAPI(title="AegisML Evaluation Service")

_eval_results_db: List[EvaluationResult] = []

def run_dummy_evaluation(eval_id: str, model_version_id: str, dataset_id: str):
    """Simulates a background evaluation task"""
    # Simulate processing time
    import time
    time.sleep(2)
    
    # Generate random metrics
    accuracy = random.uniform(0.7, 0.99)
    latency = random.uniform(10, 200)
    
    result = EvaluationResult(
        id=eval_id,
        model_version_id=model_version_id,
        dataset_id=dataset_id,
        metrics={
            EvaluationMetric.ACCURACY: accuracy,
            EvaluationMetric.LATENCY_MS: latency
        },
        passed=accuracy > 0.8
    )
    _eval_results_db.append(result)
    print(f"Evaluation {eval_id} completed for model {model_version_id}")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "evaluation"}

@app.post("/evaluate/offline", status_code=202)
async def trigger_offline_evaluation(model_version_id: str, dataset_id: str, background_tasks: BackgroundTasks):
    eval_id = str(uuid.uuid4())
    background_tasks.add_task(run_dummy_evaluation, eval_id, model_version_id, dataset_id)
    return {"evaluation_id": eval_id, "status": "pending", "message": "Evaluation started in background"}

@app.get("/results/{model_version_id}", response_model=List[EvaluationResult])
async def get_results(model_version_id: str):
    return [r for r in _eval_results_db if r.model_version_id == model_version_id]
