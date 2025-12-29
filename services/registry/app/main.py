from fastapi import FastAPI

app = FastAPI(title="AegisML Registry Service")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/models")
async def list_models():
    # Placeholder response
    return {"models": []}
