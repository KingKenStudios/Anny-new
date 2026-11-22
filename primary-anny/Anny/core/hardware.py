"""
ANNY - MODULE 02: HARDWARE DETECTION & OPTIMIZATION
Description: Handles hardware tier classification and resource allocation.
"""

import psutil
import GPUtil
import cpuinfo
from typing import Dict, Any, List
from pydantic import BaseModel

class HardwareProfile(BaseModel):
    tier: str  # LOW, MID, HIGH
    cpu_cores: int
    ram_total_gb: float
    gpu_available: bool
    gpu_vram_gb: float
    recommended_models: List[str]

class HardwareEngine:
    def __init__(self):
        self.profile = self.detect_profile()

    def get_gpu_info(self) -> Dict[str, Any]:
        """Detects NVIDIA GPUs and returns VRAM info."""
        try:
            gpus = GPUtil.getGPUs()
            if not gpus:
                return {"available": False, "vram": 0.0}
            return {
                "available": True,
                "vram": sum(gpu.memoryTotal for gpu in gpus) / 1024.0
            }
        except Exception:
            return {"available": False, "vram": 0.0}

    def detect_profile(self) -> HardwareProfile:
        """Classifies the system into hardware tiers."""
        cpu_info = cpuinfo.get_cpu_info()
        cores = psutil.cpu_count(logical=False)
        ram = psutil.virtual_memory().total / (1024**3)
        gpu = self.get_gpu_info()

        # Logic for Tier Classification
        if gpu["available"] and gpu["vram"] >= 16:
            tier = "HIGH-END"
            models = ["llama3.3", "qwen3.5", "deepseek-coder"]
        elif (gpu["available"] and gpu["vram"] >= 6) or (ram >= 16 and cores >= 8):
            tier = "MID-RANGE"
            models = ["llama3.2", "qwen2.5"]
        else:
            tier = "LOW-END"
            models = ["tinyllama", "phi4-mini"]

        return HardwareProfile(
            tier=tier,
            cpu_cores=cores,
            ram_total_gb=round(ram, 2),
            gpu_available=gpu["available"],
            gpu_vram_gb=round(gpu["vram"], 2),
            recommended_models=models
        )

    def get_current_load(self) -> Dict[str, float]:
        """Returns current CPU and RAM usage percentage."""
        return {
            "cpu_usage": psutil.cpu_percent(interval=1),
            "ram_usage": psutil.virtual_memory().percent
        }

if __name__ == "__main__":
    engine = HardwareEngine()
    print(f"ANNY Hardware Tier: {engine.profile.tier}")
    print(f"Recommended Models: {engine.profile.recommended_models}")
    print(f"System Load: {engine.get_current_load()}")
