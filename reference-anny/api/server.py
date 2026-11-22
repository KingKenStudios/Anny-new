"""
ANNY - MODULE 11: NEURAL EDGE API
Description: FastAPI interface for system inter-process communication.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import uvicorn
from core.orchestrator import NeuralOrchestrator

app = FastAPI(title="ANNY EDGE")
brain = NeuralOrchestrator()

class Query(BaseModel):
    prompt: str
    context: Dict[str, Any] = {}

@app.get("/status")
def get_status():
    """Returns the health status of the neural core."""
    return {
        "status": "online",
        "tier": brain.active_tier,
        "load": brain.hardware.get_current_load()
    }

@app.post("/think")
async def think(query: Query):
    """Primary endpoint for neural inference."""
    try:
        response = await brain.think(query.prompt, query.context)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/diagnostic/hardware")
def hardware_diagnostic():
    """Exposes deep hardware telemetry."""
    return brain.hardware.profile.dict()

def start_api(host: str = "0.0.0.0", port: int = 8000):
    """Mounts the edge interface."""
    uvicorn.run(app, host=host, port=port)

if __name__ == "__main__":
    start_api()
