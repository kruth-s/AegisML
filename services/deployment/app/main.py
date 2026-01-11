import sys
import os
import uuid
import asyncio
from typing import List

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from fastapi import FastAPI, HTTPException, BackgroundTasks
from core.models.schema import Deployment, DeploymentConfig, DeploymentStatus

app = FastAPI(title="AegisML Deployment Service")

_deployments_db: List[Deployment] = []

async def simulate_deployment_startup(deployment_id: str):
    await asyncio.sleep(5)  # Simulate startup time
    deployment = next((d for d in _deployments_db if d.id == deployment_id), None)
    if deployment:
        deployment.status = DeploymentStatus.RUNNING
        deployment.endpoint_url = f"http://inference.aegisml.internal/{deployment.model_version_id}"
        print(f"Deployment {deployment_id} is now RUNNING")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "deployment"}

@app.post("/deployments", response_model=Deployment, status_code=201)
async def create_deployment(model_version_id: str, config: DeploymentConfig, background_tasks: BackgroundTasks):
    deployment = Deployment(
        model_version_id=model_version_id,
        config=config
    )
    _deployments_db.append(deployment)
    
    # Simulate async deployment process
    background_tasks.add_task(simulate_deployment_startup, deployment.id)
    
    return deployment

@app.get("/deployments", response_model=List[Deployment])
async def list_deployments():
    return _deployments_db

@app.get("/deployments/{deployment_id}", response_model=Deployment)
async def get_deployment(deployment_id: str):
    deployment = next((d for d in _deployments_db if d.id == deployment_id), None)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment

@app.post("/deployments/{deployment_id}/stop")
async def stop_deployment(deployment_id: str):
    deployment = next((d for d in _deployments_db if d.id == deployment_id), None)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    deployment.status = DeploymentStatus.STOPPED
    return {"status": "stopped", "id": deployment_id}
