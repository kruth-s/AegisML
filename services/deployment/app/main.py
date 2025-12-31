from fastapi import FastAPI

app = FastAPI(title="AegisML Deployment Service")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/deployments")
async def list_deployments():
    return {"deployments": []}
