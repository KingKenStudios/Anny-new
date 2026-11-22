"""
ANNY - NEURAL DEVICE DETECTION
Filename: detect_device.py
Dependencies: psutil, GPUtil, py-cpuinfo, requests
"""

import os
import sys
import json
import platform
import psutil
import GPUtil
import cpuinfo
import requests
import socket
import subprocess
from typing import Dict, Any, List, Optional
from datetime import datetime

class UniversalDeviceDetector:
    """
    Handles all-spectrum device detection and classification for the ANNY neural link.
    """
    
    def __init__(self):
        self.profile: Dict[str, Any] = {}
        self.tier: str = "MINIMAL"

    def detect_os(self) -> Dict[str, str]:
        """Detect Operating System specifics."""
        return {
            "name": platform.system(),
            "version": platform.version(),
            "release": platform.release(),
            "architecture": platform.machine()
        }

    def detect_cpu(self) -> Dict[str, Any]:
        """Detect CPU details including virtualization."""
        info = cpuinfo.get_cpu_info()
        return {
            "brand": info.get("brand_raw", "Unknown"),
            "hz": info.get("hz_actual_friendly", "Unknown"),
            "cores_physical": psutil.cpu_count(logical=False),
            "cores_logical": psutil.cpu_count(logical=True),
            "usage": psutil.cpu_percent(interval=1),
            "virtualization": self._check_virtualization()
        }

    def _check_virtualization(self) -> bool:
        """Check for hardware virtualization support."""
        if platform.system() == "Windows":
            try:
                out = subprocess.check_output("systeminfo").decode()
                return "Virtualization Enabled In Firmware: Yes" in out
            except: return False
        elif platform.system() == "Linux":
            try:
                with open("/proc/cpuinfo", "r") as f:
                    content = f.read()
                    return "vt-x" in content or "amd-v" in content or "svm" in content
            except: return False
        return False

    def detect_ram(self) -> Dict[str, Any]:
        """Detect RAM capacity and usage."""
        ram = psutil.virtual_memory()
        return {
            "total_gb": round(ram.total / (1024**3), 2),
            "available_gb": round(ram.available / (1024**3), 2),
            "percent": ram.percent
        }

    def detect_gpu(self) -> List[Dict[str, Any]]:
        """Detect available GPUs via GPUtil."""
        gpus_data = []
        try:
            gpus = GPUtil.getGPUs()
            for gpu in gpus:
                gpus_data.append({
                    "name": gpu.name,
                    "vram_total": gpu.memoryTotal,
                    "vram_free": gpu.memoryFree,
                    "load": gpu.load * 100
                })
        except:
            pass
        return gpus_data

    def detect_storage(self) -> List[Dict[str, Any]]:
        """Detect disk storage statistics."""
        partitions = psutil.disk_partitions()
        storage = []
        for p in partitions:
            try:
                usage = psutil.disk_usage(p.mountpoint)
                storage.append({
                    "mount": p.mountpoint,
                    "total_gb": round(usage.total / (1024**3), 2),
                    "free_gb": round(usage.free / (1024**3), 2),
                    "percent": usage.percent
                })
            except: continue
        return storage

    def detect_environment(self) -> Dict[str, bool]:
        """Detect Docker and Internet availability."""
        return {
            "docker": os.path.exists('/.dockerenv'),
            "internet": self._check_internet()
        }

    def _check_internet(self) -> bool:
        """Ping check for internet connectivity."""
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return True
        except: return False

    def detect_all(self) -> Dict[str, Any]:
        """Orchestrate full system scan."""
        self.profile = {
            "timestamp": datetime.now().isoformat(),
            "os": self.detect_os(),
            "cpu": self.detect_cpu(),
            "ram": self.detect_ram(),
            "gpu": self.detect_gpu(),
            "storage": self.detect_storage(),
            "environment": self.detect_environment(),
            "python": sys.version
        }
        self.classify_tier()
        return self.profile

    def classify_tier(self):
        """Classify device into ANNY tiers."""
        ram_gb = self.profile["ram"]["total_gb"]
        gpu_vram = sum(g["vram_total"] for g in self.profile["gpu"]) / 1024.0
        cores = self.profile["cpu"]["cores_physical"]
        
        if gpu_vram >= 24 or (ram_gb >= 64 and cores >= 16):
            self.tier = "ULTRA"
        elif gpu_vram >= 12 or (ram_gb >= 32 and cores >= 8):
            self.tier = "HIGH"
        elif gpu_vram >= 6 or (ram_gb >= 16 and cores >= 6):
            self.tier = "MEDIUM"
        elif ram_gb >= 8:
            self.tier = "LOW"
        else:
            self.tier = "MINIMAL"
        
        self.profile["tier"] = self.tier

    def save_profile(self, path: str = "device_profile.json"):
        """Save profile to JSON vault."""
        with open(path, "w") as f:
            json.dump(self.profile, f, indent=4)
        print(f"Status: Profile secured to {path}")

    def print_report(self):
        """Formatted console diagnostic report."""
        p = self.profile
        print("\n" + "="*50)
        print(f" ANNY NEURAL LINK - DEVICE REPORT ")
        print("="*50)
        print(f"TIER:        {p['tier']}")
        print(f"OS:          {p['os']['name']} {p['os']['release']}")
        print(f"CPU:         {p['cpu']['brand']} ({p['cpu']['cores_physical']} Cores)")
        print(f"RAM:         {p['ram']['total_gb']} GB")
        print(f"GPU:         {len(p['gpu'])} Unit(s) detected")
        if p['gpu']:
            print(f"VRAM:        {sum(g['vram_total'] for g in p['gpu'])} MB")
        print(f"DOCKER:      {'Active' if p['environment']['docker'] else 'Inactive'}")
        print(f"INTERNET:    {'Online' if p['environment']['internet'] else 'Offline'}")
        print("="*50 + "\n")

if __name__ == "__main__":
    detector = UniversalDeviceDetector()
    detector.detect_all()
    detector.print_report()
    detector.save_profile()

# Usage Example:
# from detect_device import UniversalDeviceDetector
# detector = UniversalDeviceDetector()
# profile = detector.detect_all()
# print(f"Active Tier: {profile['tier']}")
