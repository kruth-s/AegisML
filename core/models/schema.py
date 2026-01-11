from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class ModelType(str, Enum):
    CLASSICAL_ML = "classical_ml"
    LLM = "llm"

class Framework(str, Enum):
    PYTORCH = "pytorch"
    SKLEARN = "sklearn"
    TENSORFLOW = "tensorflow"
    HUGGINGFACE = "huggingface"
    OPENAI = "openai"
    GEMINI = "gemini"
    OTHER = "other"

class ModelStage(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"

class ModelArtifact(BaseModel):
    uri: str
    artifact_type: str  # e.g., "weights", "code", "config"
    size_bytes: Optional[int] = None

class ModelVersion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_id: str
    version: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    stage: ModelStage = ModelStage.DEVELOPMENT
    framework: Framework
    artifacts: List[ModelArtifact] = []
    parameters: Dict[str, Any] = {}
    metrics: Dict[str, float] = {}

class RegisteredModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    model_type: ModelType
    owner: str
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)
    latest_version: Optional[str] = None

class DeploymentStrategy(str, Enum):
    ROLLING = "rolling"
    CANARY = "canary"
    SHADOW = "shadow"
    BLUE_GREEN = "blue_green"

class DeploymentConfig(BaseModel):
    strategy: DeploymentStrategy
    replicas: int = 1
    cpu_limit: str = "1000m"
    memory_limit: str = "1Gi"
    gpu_count: int = 0
    canary_weight: Optional[int] = None  # 0-100
    shadow_traffic: bool = False

class DeploymentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    FAILED = "failed"
    STOPPED = "stopped"

class Deployment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_version_id: str
    config: DeploymentConfig
    status: DeploymentStatus = DeploymentStatus.PENDING
    endpoint_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class EvaluationMetric(str, Enum):
    ACCURACY = "accuracy"
    F1_SCORE = "f1_score"
    LATENCY_MS = "latency_ms"
    HALLUCINATION_RATE = "hallucination_rate"
    TOXICITY_SCORE = "toxicity_score"

class EvaluationResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_version_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metrics: Dict[str, float]
    dataset_id: str
    passed: bool

class MetricPoint(BaseModel):
    model_version_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    name: str # e.g. "latency", "input_drift_score"
    value: float
    tags: Dict[str, str] = {}


