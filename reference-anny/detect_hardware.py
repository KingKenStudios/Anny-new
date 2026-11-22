# detect_hardware.py
# Run this on actual PC — detects real specs

import platform
import psutil
import subprocess
import json
import sys
import os

class RealSystemProfiler:
    """Detects actual PC hardware and classifies tier"""
    
    def __init__(self):
        self.os_name = platform.system()
        self.os_release = platform.release()
        self.arch = platform.machine()
        
    def get_ram(self):
        mem = psutil.virtual_memory()
        return {
            "total_gb": round(mem.total / (1024**3), 1),
            "available_gb": round(mem.available / (1024**3), 1),
            "percent_used": mem.percent
        }
    
    def get_cpu(self):
        freq = psutil.cpu_freq()
        return {
            "brand": platform.processor() or self._get_cpu_name(),
            "cores_logical": psutil.cpu_count(logical=True),
            "cores_physical": psutil.cpu_count(logical=False),
            "freq_max_mhz": round(freq.max, 0) if freq else 0,
            "freq_current_mhz": round(freq.current, 0) if freq else 0
        }
    
    def _get_cpu_name(self):
        if self.os_name == "Linux":
            try:
                with open("/proc/cpuinfo") as f:
                    for line in f:
                        if "model name" in line:
                            return line.split(":")[1].strip()
            except: pass
        elif self.os_name == "Darwin":
            try:
                r = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], 
                                 capture_output=True, text=True)
                return r.stdout.strip()
            except: pass
        return "Unknown"
    
    def get_gpu(self):
        gpus = []
        has_cuda = False
        
        # NVIDIA
        try:
            r = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", 
                              "--format=csv,noheader"], capture_output=True, text=True)
            if r.returncode == 0:
                for line in r.stdout.strip().split("\n"):
                    parts = [p.strip() for p in line.split(",")]
                    vram = int(parts[1].replace("MiB", "").replace("MB", "")) / 1024
                    gpus.append({"name": parts[0], "vram_gb": round(vram, 1), "type": "nvidia"})
                has_cuda = True
        except: pass
        
        # AMD (Linux)
        if not gpus and self.os_name == "Linux":
            try:
                r = subprocess.run(["lspci"], capture_output=True, text=True)
                for line in r.stdout.split("\n"):
                    if "VGA" in line and any(x in line for x in ["AMD", "Radeon", "ATI"]):
                        gpus.append({"name": line.split(":")[-1].strip(), "vram_gb": 0, "type": "amd"})
            except: pass
        
        # Apple Silicon
        if self.os_name == "Darwin":
            try:
                r = subprocess.run(["system_profiler", "SPDisplaysDataType"], 
                                 capture_output=True, text=True)
                if "Apple M" in r.stdout:
                    import re
                    m = re.search(r'Apple M\d+', r.stdout)
                    chip = m.group(0) if m else "Apple Silicon"
                    ram = self.get_ram()["total_gb"] * 0.5
                    gpus.append({"name": chip, "vram_gb": round(ram, 1), "type": "apple_silicon"})
            except: pass
        
        if not gpus:
            gpus.append({"name": "Integrated Graphics", "vram_gb": 0, "type": "integrated"})
        
        return {"gpus": gpus, "has_cuda": has_cuda}
    
    def get_storage(self):
        disk = psutil.disk_usage("/")
        return {
            "total_gb": round(disk.total / (1024**3), 1),
            "free_gb": round(disk.free / (1024**3), 1),
            "used_percent": disk.percent
        }
    
    def classify_tier(self):
        ram = self.get_ram()["total_gb"]
        cpu = self.get_cpu()
        cores = cpu["cores_logical"]
        freq = cpu["freq_max_mhz"]
        storage = self.get_storage()
        
        if ram < 4 or cores < 2 or freq < 1500:
            return "LEGACY"
        if ram < 6:
            return "MINIMAL"
        if ram < 8 or (cores < 4 and freq < 2000):
            return "LOW"
        if ram < 16 or cores < 6:
            return "MEDIUM"
        if ram < 32 or not self.get_gpu()["has_cuda"]:
            return "HIGH"
        return "ULTRA"
    
    def get_full_profile(self):
        tier = self.classify_tier()
        ram = self.get_ram()
        cpu = self.get_cpu()
        gpu = self.get_gpu()
        storage = self.get_storage()
        
        # Tier configurations
        configs = {
            "LEGACY": {
                "models": {"primary": "phi4", "secondary": None, "embedding": "nomic-embed-text"},
                "vision": None, "speech": {"whisper": "tiny", "piper": "en_US-lessac-low"},
                "yolo": None, "pytorch": "cpu", "max_size_gb": 2,
                "features": ["text_chat"], "install_ros": False
            },
            "MINIMAL": {
                "models": {"primary": "phi4", "secondary": "qwen2.5-3b", "embedding": "nomic-embed-text"},
                "vision": None, "speech": {"whisper": "tiny", "piper": "en_US-lessac-low"},
                "yolo": None, "pytorch": "cpu", "max_size_gb": 3,
                "features": ["text_chat", "voice_input"], "install_ros": False
            },
            "LOW": {
                "models": {"primary": "llama3.2", "secondary": "qwen2.5-3b", "embedding": "nomic-embed-text"},
                "vision": "llava-phi3", "speech": {"whisper": "base", "piper": "en_US-lessac-medium"},
                "yolo": "yolov8n.pt", "pytorch": "cpu", "max_size_gb": 6,
                "features": ["text_chat", "voice_io", "basic_vision", "rag"], "install_ros": False
            },
            "MEDIUM": {
                "models": {"primary": "llama3.2", "secondary": "qwen2.5-7b", "embedding": "nomic-embed-text"},
                "vision": "llava-llama3", "speech": {"whisper": "small", "piper": "en_US-lessac-medium"},
                "yolo": "yolov8s.pt", "pytorch": "cpu", "max_size_gb": 12,
                "features": ["text_chat", "voice_io", "vision", "rag", "coding_ai"], "install_ros": False
            },
            "HIGH": {
                "models": {"primary": "llama3.3", "secondary": "qwen3.5", "embedding": "nomic-embed-text"},
                "vision": "llava-llama3", "speech": {"whisper": "medium", "piper": "en_US-lessac-medium"},
                "yolo": "yolov8m.pt", "pytorch": "cuda" if gpu["has_cuda"] else "cpu", "max_size_gb": 20,
                "features": ["text_chat", "voice_io", "vision", "rag", "coding_ai", "robotics_sim"],
                "install_ros": self.os_name == "Linux"
            },
            "ULTRA": {
                "models": {"primary": "llama3.3", "secondary": "qwen3.5-72b", "embedding": "nomic-embed-text"},
                "vision": "llava-llama3", "speech": {"whisper": "large-v3", "piper": "en_US-lessac-high"},
                "yolo": "yolov8x.pt", "pytorch": "cuda", "max_size_gb": 50,
                "features": ["all_features"], "install_ros": self.os_name == "Linux"
            }
        }
        
        config = configs.get(tier, configs["MEDIUM"])
        
        # Storage check
        if storage["free_gb"] < config["max_size_gb"] * 1.5:
            config["storage_warning"] = f"WARNING: Only {storage['free_gb']}GB free. Need {config['max_size_gb']}GB for models."
            # Downgrade models if needed
            if tier in ["HIGH", "ULTRA"]:
                config["models"]["primary"] = "llama3.2"
                config["models"]["secondary"] = "qwen2.5-7b"
                config["max_size_gb"] = 12
        
        return {
            "tier": tier,
            "system": {
                "os": self.os_name, "os_version": self.os_release, "arch": self.arch,
                "cpu": cpu, "ram": ram, "gpu": gpu, "storage": storage
            },
            "config": config,
            "estimated_install_time": self._estimate_time(tier, config["max_size_gb"])
        }
    
    def _estimate_time(self, tier, size_gb):
        """Estimate download + install time"""
        # Rough estimates: 10 min per GB download + 5 min setup
        return f"~{round(size_gb * 10 + 5)} minutes"
    
    def save_profile(self, filename="system_profile.json"):
        profile = self.get_full_profile()
        with open(filename, "w") as f:
            json.dump(profile, f, indent=2)
        return profile
    
    def print_summary(self):
        p = self.get_full_profile()
        s = p["system"]
        c = p["config"]
        
        print("=" * 65)
        print(f"🖥️  SYSTEM PROFILE")
        print("=" * 65)
        print(f"OS: {s['os']} {s['os_version']} ({s['arch']})")
        print(f"CPU: {s['cpu']['brand']}")
        print(f"   {s['cpu']['cores_physical']} physical / {s['cpu']['cores_logical']} logical cores")
        print(f"   {s['cpu']['freq_max_mhz']} MHz max")
        print(f"RAM: {s['ram']['total_gb']} GB total ({s['ram']['available_gb']} GB available)")
        print(f"Storage: {s['storage']['total_gb']} GB total / {s['storage']['free_gb']} GB free")
        if s['gpu']['gpus']:
            for g in s['gpu']['gpus']:
                print(f"GPU: {g['name']} ({g['vram_gb']} GB VRAM)")
        print("-" * 65)
        print(f"🎯 TIER: {p['tier']}")
        print(f"⏱️  Est. Install Time: {p['estimated_install_time']}")
        print("-" * 65)
        print("📦 AI STACK:")
        print(f"   Primary LLM: {c['models']['primary']}")
        if c['models']['secondary']:
            print(f"   Secondary LLM: {c['models']['secondary']}")
        print(f"   Embedding: {c['models']['embedding']}")
        print(f"   Vision: {c['vision'] or 'Not available'}")
        print(f"   Speech: {c['speech']['whisper']} (in) / {c['speech']['piper']} (out)")
        print(f"   YOLO: {c['yolo'] or 'Not available'}")
        print(f"   PyTorch: {c['pytorch']}")
        print("-" * 65)
        print(f"✅ Features: {', '.join(c['features'])}")
        if 'storage_warning' in c:
            print(f"⚠️  {c['storage_warning']}")
        print("=" * 65)

if __name__ == "__main__":
    print("🔍 Detecting system hardware...")
    profiler = RealSystemProfiler()
    profiler.print_summary()
    profiler.save_profile()
    print("\n✅ Profile saved to system_profile.json")
    print("Run install_ai_robot.py next to begin installation.")
