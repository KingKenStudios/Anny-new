#!/usr/bin/env python3
"""
Universal System Profiler
Auto-detects hardware and recommends AI stack tier
Works on: Windows, macOS, Linux
"""

import platform
import subprocess
import json
import sys
import os
import psutil

class UniversalProfiler:
    def __init__(self):
        self.os_name = platform.system()
        self.os_version = platform.version()
        self.arch = platform.machine()
        
    def get_ram_gb(self):
        """Total RAM in GB"""
        return round(psutil.virtual_memory().total / (1024**3), 1)
    
    def get_ram_available_gb(self):
        """Available RAM in GB"""
        return round(psutil.virtual_memory().available / (1024**3), 1)
    
    def get_cpu_cores(self):
        """Logical CPU cores"""
        return psutil.cpu_count(logical=True)
    
    def get_cpu_physical_cores(self):
        """Physical CPU cores"""
        return psutil.cpu_count(logical=False)
    
    def get_cpu_freq_mhz(self):
        """CPU frequency in MHz"""
        freq = psutil.cpu_freq()
        return round(freq.max, 0) if freq else 0
    
    def get_cpu_name(self):
        """CPU brand/model name"""
        if self.os_name == "Windows":
            return platform.processor()
        elif self.os_name == "Darwin":
            try:
                result = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], 
                                      capture_output=True, text=True)
                return result.stdout.strip()
            except:
                return "Apple Silicon/Intel Mac"
        else:
            try:
                with open("/proc/cpuinfo") as f:
                    for line in f:
                        if "model name" in line:
                            return line.split(":")[1].strip()
            except:
                pass
        return "Unknown CPU"
    
    def get_gpu_info(self):
        """GPU detection with CUDA check"""
        gpus = []
        has_cuda = False
        cuda_version = None
        
        # NVIDIA CUDA check
        try:
            result = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version", 
                                   "--format=csv,noheader"], capture_output=True, text=True)
            if result.returncode == 0:
                for line in result.stdout.strip().split("\n"):
                    parts = [p.strip() for p in line.split(",")]
                    if len(parts) >= 2:
                        gpus.append({
                            "name": parts[0],
                            "vram_gb": round(int(parts[1].replace("MiB", "").replace("MB", "")) / 1024, 1),
                            "type": "nvidia",
                            "cuda_capable": True
                        })
                has_cuda = True
                # Get CUDA version
                cv = subprocess.run(["nvcc", "--version"], capture_output=True, text=True)
                if cv.returncode == 0:
                    for line in cv.stdout.split("\n"):
                        if "release" in line:
                            cuda_version = line.split("release")[-1].split(",")[0].strip()
        except FileNotFoundError:
            pass
        
        # AMD GPU check (Linux)
        if not gpus and self.os_name == "Linux":
            try:
                result = subprocess.run(["lspci"], capture_output=True, text=True)
                if "AMD" in result.stdout or "Radeon" in result.stdout:
                    for line in result.stdout.split("\n"):
                        if "VGA" in line and ("AMD" in line or "Radeon" in line):
                            gpus.append({
                                "name": line.split(":")[-1].strip(),
                                "vram_gb": 0,  # Unknown without specific tools
                                "type": "amd",
                                "cuda_capable": False
                            })
            except:
                pass
        
        # Apple Silicon
        if self.os_name == "Darwin":
            try:
                result = subprocess.run(["system_profiler", "SPDisplaysDataType"], 
                                      capture_output=True, text=True)
                output = result.stdout
                if "Apple M" in output:
                    # Extract M1/M2/M3 and RAM shared
                    import re
                    chip_match = re.search(r'Apple M\d+', output)
                    chip = chip_match.group(0) if chip_match else "Apple Silicon"
                    gpus.append({
                        "name": chip,
                        "vram_gb": self.get_ram_gb() * 0.5,  # Shared memory approximation
                        "type": "apple_silicon",
                        "cuda_capable": False,
                        "metal_capable": True
                    })
            except:
                pass
        
        # Windows DirectX/WMI fallback
        if self.os_name == "Windows" and not gpus:
            try:
                import wmi
                c = wmi.WMI()
                for gpu in c.Win32_VideoController():
                    if gpu.AdapterRAM:
                        vram = round(int(gpu.AdapterRAM) / (1024**3), 1)
                    else:
                        vram = 0
                    gpus.append({
                        "name": gpu.Name,
                        "vram_gb": vram,
                        "type": "unknown",
                        "cuda_capable": False
                    })
            except ImportError:
                pass
        
        # Integrated graphics fallback
        if not gpus:
            gpus.append({
                "name": "Integrated Graphics",
                "vram_gb": 0,
                "type": "integrated",
                "cuda_capable": False
            })
        
        return {
            "gpus": gpus,
            "has_cuda": has_cuda,
            "cuda_version": cuda_version,
            "has_metal": any(g.get("metal_capable") for g in gpus)
        }
    
    def get_storage_info(self):
        """Disk space info"""
        disk = psutil.disk_usage("/")
        return {
            "total_gb": round(disk.total / (1024**3), 1),
            "free_gb": round(disk.free / (1024**3), 1),
            "used_gb": round(disk.used / (1024**3), 1),
            "percent_used": disk.percent
        }
    
    def get_swap_gb(self):
        """Swap/total virtual memory in GB"""
        swap = psutil.swap_memory()
        return round(swap.total / (1024**3), 1)
    
    def classify_tier(self):
        """
        Classify system into performance tier
        Returns: "MINIMAL", "LOW", "MEDIUM", "HIGH", "ULTRA", "LEGACY"
        """
        ram = self.get_ram_gb()
        cores = self.get_cpu_cores()
        freq = self.get_cpu_freq_mhz()
        storage = self.get_storage_info()
        
        # Legacy detection (very old systems)
        if ram < 4 or cores < 2 or freq < 1500:
            return "LEGACY"
        
        # Minimal (can barely run)
        if ram < 6:
            return "MINIMAL"
        
        # Low (basic functionality)
        if ram < 8 or (cores < 4 and freq < 2000):
            return "LOW"
        
        # Medium (decent performance)
        if ram < 16 or cores < 6:
            return "MEDIUM"
        
        # High (full stack capable)
        if ram < 32 or (not self.get_gpu_info()["has_cuda"] and ram < 24):
            return "HIGH"
        
        # Ultra (workstation/server)
        return "ULTRA"
    
    def get_recommendations(self):
        """Get full system profile with AI stack recommendations"""
        tier = self.classify_tier()
        gpu_info = self.get_gpu_info()
        storage = self.get_storage_info()
        
        # Model recommendations per tier
        models = {
            "LEGACY": {
                "tier_name": "Legacy System",
                "description": "Very limited — text-only AI, no vision/speech",
                "primary_llm": "phi4",
                "secondary_llm": None,
                "embedding": "nomic-embed-text",
                "vision_model": None,
                "whisper_model": "tiny",
                "piper_voice": "en_US-lessac-low",
                "yolo_model": None,
                "pytorch_backend": "cpu",
                "max_model_size_gb": 2,
                "features": ["text_chat", "basic_rag"],
                "excluded": ["vision", "speech_synthesis", "ros2", "gazebo", "large_models"]
            },
            "MINIMAL": {
                "tier_name": "Minimal",
                "description": "Basic text AI with lightweight speech",
                "primary_llm": "phi4",
                "secondary_llm": "qwen2.5-3b",
                "embedding": "nomic-embed-text",
                "vision_model": None,
                "whisper_model": "tiny",
                "piper_voice": "en_US-lessac-low",
                "yolo_model": None,
                "pytorch_backend": "cpu",
                "max_model_size_gb": 3,
                "features": ["text_chat", "voice_input", "basic_rag"],
                "excluded": ["vision", "speech_synthesis", "ros2", "gazebo"]
            },
            "LOW": {
                "tier_name": "Low-End",
                "description": "Functional AI with lightweight vision",
                "primary_llm": "llama3.2",
                "secondary_llm": "qwen2.5-3b",
                "embedding": "nomic-embed-text",
                "vision_model": "llava-phi3",
                "whisper_model": "base",
                "piper_voice": "en_US-lessac-medium",
                "yolo_model": "yolov8n.pt",
                "pytorch_backend": "cpu",
                "max_model_size_gb": 6,
                "features": ["text_chat", "voice_input", "voice_output", "basic_vision", "rag"],
                "excluded": ["ros2", "gazebo", "large_models"]
            },
            "MEDIUM": {
                "tier_name": "Mid-Range",
                "description": "Balanced AI with good vision and speech",
                "primary_llm": "llama3.2",
                "secondary_llm": "qwen2.5-7b",
                "embedding": "nomic-embed-text",
                "vision_model": "llava-llama3",
                "whisper_model": "small",
                "piper_voice": "en_US-lessac-medium",
                "yolo_model": "yolov8s.pt",
                "pytorch_backend": "cpu",
                "max_model_size_gb": 10,
                "features": ["text_chat", "voice_input", "voice_output", "vision", "rag", "coding_ai"],
                "excluded": ["ros2", "gazebo"]
            },
            "HIGH": {
                "tier_name": "High-Performance",
                "description": "Full AI stack with robotics simulation",
                "primary_llm": "llama3.3",
                "secondary_llm": "qwen3.5",
                "embedding": "nomic-embed-text",
                "vision_model": "llava-llama3",
                "whisper_model": "medium",
                "piper_voice": "en_US-lessac-medium",
                "yolo_model": "yolov8m.pt",
                "pytorch_backend": "cuda" if gpu_info["has_cuda"] else "cpu",
                "max_model_size_gb": 20,
                "features": ["text_chat", "voice_input", "voice_output", "vision", "rag", "coding_ai", "robotics_sim", "workflow_automation"],
                "excluded": [] if self.os_name == "Linux" else ["ros2", "gazebo"]
            },
            "ULTRA": {
                "tier_name": "Ultra Workstation",
                "description": "Maximum capability with all features",
                "primary_llm": "llama3.3",
                "secondary_llm": "qwen3.5-72b",
                "embedding": "nomic-embed-text",
                "vision_model": "llava-llama3",
                "whisper_model": "large-v3",
                "piper_voice": "en_US-lessac-high",
                "yolo_model": "yolov8x.pt",
                "pytorch_backend": "cuda" if gpu_info["has_cuda"] else "cpu",
                "max_model_size_gb": 50,
                "features": ["all_features"],
                "excluded": []
            }
        }
        
        profile = models[tier].copy()
        profile["tier"] = tier
        profile["system"] = {
            "os": self.os_name,
            "os_version": self.os_version,
            "arch": self.arch,
            "cpu": self.get_cpu_name(),
            "cpu_cores": self.get_cpu_cores(),
            "cpu_physical_cores": self.get_cpu_physical_cores(),
            "cpu_freq_mhz": self.get_cpu_freq_mhz(),
            "ram_gb": self.get_ram_gb(),
            "ram_available_gb": self.get_ram_available_gb(),
            "swap_gb": self.get_swap_gb(),
            "gpu": gpu_info,
            "storage": storage
        }
        
        # Storage warnings
        if storage["free_gb"] < 20:
            profile["storage_warning"] = "CRITICAL: Less than 20GB free. Large models may fail."
            profile["max_model_size_gb"] = min(profile["max_model_size_gb"], 5)
        elif storage["free_gb"] < 50:
            profile["storage_warning"] = "Low storage. Consider external drive for models."
        
        # RAM warnings
        if self.get_ram_available_gb() < 2:
            profile["ram_warning"] = "Very low available RAM. Close other applications."
        
        return profile
    
    def save_profile(self, filename="system_profile.json"):
        """Save profile to JSON"""
        profile = self.get_recommendations()
        with open(filename, "w") as f:
            json.dump(profile, f, indent=2)
        print(f"✅ System profile saved to {filename}")
        return profile
    
    def print_summary(self):
        """Print human-readable summary"""
        p = self.get_recommendations()
        sys = p["system"]
        
        print("=" * 60)
        print(f"🖥️  SYSTEM DETECTED: {p['tier_name']}")
        print(f"   Tier: {p['tier']}")
        print("=" * 60)
        print(f"OS: {sys['os']} {sys['os_version']} ({sys['arch']})")
        print(f"CPU: {sys['cpu']}")
        print(f"   Cores: {sys['cpu_physical_cores']} physical / {sys['cpu_cores']} logical")
        print(f"   Frequency: {sys['cpu_freq_mhz']} MHz")
        print(f"RAM: {sys['ram_gb']} GB total ({sys['ram_available_gb']} GB available)")
        print(f"Swap: {sys['swap_gb']} GB")
        print(f"Storage: {sys['storage']['total_gb']} GB total / {sys['storage']['free_gb']} GB free")
        
        if sys['gpu']['gpus']:
            print("GPU(s):")
            for gpu in sys['gpu']['gpus']:
                print(f"   • {gpu['name']} ({gpu['vram_gb']} GB VRAM)")
            print(f"   CUDA: {'✅ ' + sys['gpu']['cuda_version'] if sys['gpu']['has_cuda'] else '❌ Not available'}")
        
        print("-" * 60)
        print(f"🧠 Primary LLM: {p['primary_llm']}")
        if p['secondary_llm']:
            print(f"🧠 Secondary LLM: {p['secondary_llm']}")
        print(f"👁️  Vision: {p['vision_model'] or '❌ Not available'}")
        print(f"🎤 Speech: {p['whisper_model']} (input) / {p['piper_voice']} (output)")
        print(f"📊 YOLO: {p['yolo_model'] or '❌ Not available'}")
        print(f"⚡ PyTorch: {p['pytorch_backend']}")
        print("-" * 60)
        print(f"✅ Features: {', '.join(p['features'])}")
        if p['excluded']:
            print(f"❌ Excluded: {', '.join(p['excluded'])}")
        if 'storage_warning' in p:
            print(f"⚠️  {p['storage_warning']}")
        if 'ram_warning' in p:
            print(f"⚠️  {p['ram_warning']}")
        print("=" * 60)

if __name__ == "__main__":
    profiler = UniversalProfiler()
    profiler.print_summary()
    profiler.save_profile()
