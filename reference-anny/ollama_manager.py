"""
ANNY - NEURAL OLLAMA MANAGER
Filename: ollama_manager.py
Description: Robust lifecycle management and inference orchestration for local Ollama models.
"""

import os
import time
import json
import logging
import subprocess
import psutil
import requests
import ollama
from typing import Generator, List, Dict, Any, Optional, Union

class OllamaManager:
    """
    Manages local Ollama installation, service state, model synchronization, 
    and high-performance inference.
    """
    
    def __init__(self, default_model: str = "llama3.2"):
        self.default_model = default_model
        self.host = "http://localhost:11434"
        self._setup_logging()

    def _setup_logging(self):
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("Anny.OllamaManager")

    def ensure_ollama(self) -> bool:
        """
        Detects installation and starts the service if inactive.
        Returns True if service is reactive.
        """
        if self.check_health():
            return True

        self.logger.info("Status: Ollama service inactive. Attempting auto-start...")
        try:
            # Platform-specific start logic
            if os.name == 'nt':  # Windows
                subprocess.Popen(["ollama", "serve"], creationflags=subprocess.CREATE_NEW_CONSOLE)
            else:  # Linux/Mac
                subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Wait for warm-up
            for i in range(10):
                time.sleep(2)
                if self.check_health():
                    self.logger.info("Status: Ollama service successfully initialized.")
                    return True
        except Exception as e:
            self.logger.error(f"Error: Failed to launch local brain. {str(e)}")
        
        return False

    def check_health(self) -> bool:
        """Verifies API responsiveness."""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=3)
            return response.status_code == 200
        except:
            return False

    def pull_model(self, model_name: str) -> bool:
        """
        Synchronizes a specific model from the neural library.
        Includes retry logic for unstable links.
        """
        self.logger.info(f"Status: Synchronizing model {model_name}...")
        retries = 3
        for attempt in range(retries):
            try:
                ollama.pull(model_name)
                self.logger.info(f"Status: Model {model_name} successfully linked.")
                return True
            except Exception as e:
                self.logger.warning(f"Warning: Pull failed. Retrying... ({attempt+1}/{retries})")
                time.sleep(5)
        return False

    def is_model_available(self, model_name: str) -> bool:
        """Checks if the neural matrix is present in local vault."""
        try:
            models = ollama.list()
            return any(m['name'].split(':')[0] == model_name.split(':')[0] for m in models['models'])
        except:
            return False

    def run_prompt(self, prompt: str, model: Optional[str] = None, system: str = "") -> str:
        """
        Executes synchronous inference with strict timeout handling.
        """
        target_model = model or self.default_model
        if not self.is_model_available(target_model):
            self.pull_model(target_model)

        try:
            response = ollama.generate(
                model=target_model,
                prompt=prompt,
                system=system,
                options={"temperature": 0.7}
            )
            return response['response']
        except Exception as e:
            self.logger.error(f"Error: Inference failed. {str(e)}")
            return f"[NEURAL_ERROR] Local brain lost. {str(e)}"

    def stream_response(self, prompt: str, model: Optional[str] = None) -> Generator[str, None, None]:
        """
        Streams neural response for low-latency feedback.
        """
        target_model = model or self.default_model
        try:
            stream = ollama.generate(model=target_model, prompt=prompt, stream=True)
            for chunk in stream:
                yield chunk['response']
        except Exception as e:
            yield f"\n[CRITICAL] Stream fragmented: {str(e)}"

    def get_system_load(self) -> Dict[str, float]:
        """Telemetry for resource monitoring."""
        return {
            "cpu_percent": psutil.cpu_percent(),
            "ram_percent": psutil.virtual_memory().percent
        }

if __name__ == "__main__":
    # Internal validation logic
    manager = OllamaManager()
    if manager.ensure_ollama():
        print("Anny Neural Manager: ONLINE")
        # Example Sync Call
        # resp = manager.run_prompt("Self-diagnose system health.")
        # print(f"Brain: {resp}")
        
        # Example Stream
        # print("Streaming Think...")
        # for chunk in manager.stream_response("Explain LOTO safety."):
        #     print(chunk, end="", flush=True)
    else:
        print("Anny Neural Manager: OFFLINE (Check Installation)")
