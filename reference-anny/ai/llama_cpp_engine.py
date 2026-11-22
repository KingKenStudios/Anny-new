"""
ANNY - LOCAL LLAMA.CPP INFERENCE ENGINE
Filename: ai/llama_cpp_engine.py
Description: Manages local llama.cpp backends (CUDA, Vulkan v2.27.1, CPU AVX2) and server process lifecycle.
"""

import os
import subprocess
import logging
from typing import Dict, Any, Optional

class LlamaCppEngineManager:
    """
    Manages local llama.cpp server binaries:
    - CUDA: /llama.cpp-win-x86_64-nvidia-cuda-avx2-2.20.1
    - Vulkan: /llama.cpp-win-x86_64-vulkan-avx2-2.27.1 (Latest)
    - CPU: /llama.cpp-win-x86_64-avx2-2.20.1
    """

    def __init__(self, root_dir: str = "."):
        self.root_dir = os.path.abspath(root_dir)
        self.logger = logging.getLogger("Anny.LlamaCppEngine")
        self.backends = self._discover_backends()

    def _discover_backends(self) -> Dict[str, str]:
        backends = {}
        cuda_path = os.path.join(self.root_dir, "llama.cpp-win-x86_64-nvidia-cuda-avx2-2.20.1", "llama-server.exe")
        vulkan_path = os.path.join(self.root_dir, "llama.cpp-win-x86_64-vulkan-avx2-2.27.1", "llama-server.exe")
        cpu_path = os.path.join(self.root_dir, "llama.cpp-win-x86_64-avx2-2.20.1", "llama-server.exe")

        if os.path.exists(cuda_path):
            backends["cuda"] = cuda_path
        if os.path.exists(vulkan_path):
            backends["vulkan"] = vulkan_path
        if os.path.exists(cpu_path):
            backends["cpu"] = cpu_path

        return backends

    def select_backend(self, has_nvidia: bool = False, has_vulkan: bool = True) -> Optional[str]:
        """Dynamically selects optimal llama.cpp server executable."""
        if has_nvidia and "cuda" in self.backends:
            return self.backends["cuda"]
        elif has_vulkan and "vulkan" in self.backends:
            return self.backends["vulkan"]
        elif "cpu" in self.backends:
            return self.backends["cpu"]
        return None

    def get_backend_status(self) -> Dict[str, Any]:
        return {
            "available_backends": list(self.backends.keys()),
            "paths": self.backends,
            "recommended": self.select_backend(has_nvidia=False, has_vulkan=True)
        }

if __name__ == "__main__":
    manager = LlamaCppEngineManager()
    print("ANNY Llama.cpp Engine Manager Status:")
    print(manager.get_backend_status())
