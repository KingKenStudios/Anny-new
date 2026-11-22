"""
ANNY - MODULE 01: NEURAL ORCHESTRATOR
Description: The central brain that routes prompts to the correct inference engine.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from core.hardware import HardwareEngine
from ai.llama_cpp_engine import LlamaCppEngineManager

class AIResponse(BaseModel):
    content: str
    engine: str
    model: str
    latency: float
    offline: bool

class NeuralOrchestrator:
    def __init__(self):
        self.hardware = HardwareEngine()
        self.llama_engine = LlamaCppEngineManager()
        self.system_prompt = "You are ANNY, a universal offline-first ecosystem."
        self.active_tier = self.hardware.profile.tier

    def route_request(self, prompt: str, task_type: str = "general") -> Dict[str, Any]:
        """
        Determines the best model based on task complexity and hardware tier.
        """
        recommended_models = self.hardware.profile.recommended_models
        
        # Selection logic based on task_type
        if task_type == "code":
            selected_model = "deepseek-coder" if "deepseek-coder" in recommended_models else recommended_models[0]
        elif task_type == "safety":
            selected_model = "phi4-mini"  # High reasoning, small footprint
        else:
            selected_model = recommended_models[0]

        selected_backend = self.llama_engine.select_backend(
            has_nvidia=self.hardware.profile.gpu_available,
            has_vulkan=True
        )

        return {
            "model": selected_model,
            "engine": "Ollama" if not selected_backend else "LlamaCpp/Ollama",
            "llama_cpp_path": selected_backend,
            "offline_priority": True,
            "system_prompt": self.system_prompt
        }

    async def think(self, prompt: str, context: Optional[Dict] = None) -> AIResponse:
        """
        Placeholder for executing local inference. 
        Actual implementation will link to Module 03 (ollama_client).
        """
        route = self.route_request(prompt)
        
        # Mock execution for Module 01 logic verification
        return AIResponse(
            content=f"[NEURAL LINK ACTIVE] Processing via {route['model']}...",
            engine=route["engine"],
            model=route["model"],
            latency=0.0,
            offline=True
        )

if __name__ == "__main__":
    orchestrator = NeuralOrchestrator()
    print(f"Orchestrator Active. System Tier: {orchestrator.active_tier}")
    print(f"Routing Strategy: {orchestrator.route_request('Write a python script', 'code')}")
