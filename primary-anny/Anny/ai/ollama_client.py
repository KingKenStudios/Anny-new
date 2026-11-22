"""
ANNY - MODULE 03: LOCAL LLM INTERFACE
Description: High-level wrapper for Ollama local inference.
"""

import ollama
from typing import Generator, Dict, Any, List
import logging

class OllamaClient:
    def __init__(self, default_model: str = "llama3.2"):
        self.default_model = default_model
        self.logger = logging.getLogger("Anny.Ollama")

    def chat(self, messages: List[Dict[str, str]], model: str = None) -> str:
        """Synchronous chat completion."""
        target_model = model or self.default_model
        try:
            response = ollama.chat(model=target_model, messages=messages)
            return response['message']['content']
        except Exception as e:
            self.logger.error(f"Ollama chat error: {str(e)}")
            return f"Error: Local brain connection lost. {str(e)}"

    def chat_stream(self, messages: List[Dict[str, str]], model: str = None) -> Generator[str, None, None]:
        """Streaming chat completion for better UX."""
        target_model = model or self.default_model
        try:
            stream = ollama.chat(model=target_model, messages=messages, stream=True)
            for chunk in stream:
                yield chunk['message']['content']
        except Exception as e:
            self.logger.error(f"Ollama stream error: {str(e)}")
            yield f"\n[CRITICAL] Stream interrupted: {str(e)}"

    def list_local_models(self) -> List[str]:
        """Returns a list of models currently present in the local vault."""
        try:
            models_info = ollama.list()
            return [m['name'] for m in models_info['models']]
        except Exception:
            return []

    def pull_model(self, model_name: str):
        """Downloads a neural matrix if not present."""
        print(f"Status: Synchronizing {model_name}...")
        ollama.pull(model_name)

if __name__ == "__main__":
    client = OllamaClient()
    print("Testing local inference (sync)...")
    resp = client.chat([{"role": "user", "content": "Identify system status."}])
    print(f"Response: {resp}")
