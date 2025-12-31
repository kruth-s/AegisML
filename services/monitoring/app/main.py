from fastapi import FastAPI

app = FastAPI(title="AegisML Monitoring Service")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/metrics")
async def metrics():
    return {"metrics": {}}
