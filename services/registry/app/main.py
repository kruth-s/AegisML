import sys
import os
from typing import List, Optional

# Add project root to sys.path to allow importing core
# This assumes the service is running from within the services structure or root
# A robust solution would install core as a package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from fastapi import FastAPI, HTTPException, status
from core.models.schema import RegisteredModel, ModelVersion, ModelStage, ModelType

app = FastAPI(
    title="AegisML Registry Service",
    description="Centralized model registry and versioning for ML/LLM artifacts.",
    version="0.1.0"
)

# In-memory storage for demonstration
_models_db: List[RegisteredModel] = []
_versions_db: List[ModelVersion] = []

@app.get("/health")
async def health():
    return {"status": "ok", "service": "registry"}

# --- Model Management ---

@app.post("/models", response_model=RegisteredModel, status_code=status.HTTP_201_CREATED)
async def create_model(model: RegisteredModel):
    # Check if name exists
    if any(m.name == model.name for m in _models_db):
        raise HTTPException(status_code=400, detail="Model with this name already exists.")
    _models_db.append(model)
    return model

@app.get("/models", response_model=List[RegisteredModel])
async def list_models(type: Optional[ModelType] = None):
    if type:
        return [m for m in _models_db if m.model_type == type]
    return _models_db

@app.get("/models/{name}", response_model=RegisteredModel)
async def get_model(name: str):
    model = next((m for m in _models_db if m.name == name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model

# --- Version Management ---

@app.post("/models/{name}/versions", response_model=ModelVersion, status_code=status.HTTP_201_CREATED)
async def register_version(name: str, version: ModelVersion):
    model = next((m for m in _models_db if m.name == name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found. Create the model first.")
    
    # Check version uniqueness for this model
    if any(v.version == version.version and v.model_id == model.id for v in _versions_db):
         raise HTTPException(status_code=400, detail=f"Version {version.version} already exists for model {name}.")
    
    # Link version to model ID just in case
    version.model_id = model.id
    _versions_db.append(version)
    
    # Update latest version pointer
    model.latest_version = version.version
    
    return version

@app.get("/models/{name}/versions", response_model=List[ModelVersion])
async def list_versions(name: str):
    model = next((m for m in _models_db if m.name == name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return [v for v in _versions_db if v.model_id == model.id]

@app.get("/models/{name}/versions/{version_tag}", response_model=ModelVersion)
async def get_version(name: str, version_tag: str):
    model = next((m for m in _models_db if m.name == name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    version = next((v for v in _versions_db if v.model_id == model.id and v.version == version_tag), None)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version

@app.put("/models/{name}/versions/{version_tag}/stage", response_model=ModelVersion)
async def update_stage(name: str, version_tag: str, stage: ModelStage):
    model = next((m for m in _models_db if m.name == name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    version = next((v for v in _versions_db if v.model_id == model.id and v.version == version_tag), None)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    version.stage = stage
    return version
