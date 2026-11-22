"""
ANNY - MASTER NEURAL ORCHESTRATOR
Filename: main.py
Description: The primary entry point for the ANNY ecosystem. 
             Orchestrates hardware detection, AI routing, security, safety, 
             memory, and visual/vocal interfaces.
"""

import os
import sys
import time
import asyncio
import logging
import threading
from typing import Optional

# Core & Infrastructure
from detect_device import UniversalDeviceDetector
from installer import UniversalInstaller
from ai_router import AIRouter
from utils.quota_guard import QuotaGuard
from database.memory_engine import MemoryEngine
from ui_launcher import UILauncher

# AI Engines
from ai.voice_engine import VoiceEngine
from ai.vision_engine import VisionEngine
from security.cybersecurity_guard import CybersecurityGuard

# Industrial & Safety
from industrial.industrial_safety import IndustrialSafety
from api.api_gateway import APIGateway
from utils.helpers import neural_print, Colors, VERSION

class Anny:
    """
    Master controller for the ANNY offline-first AI ecosystem.
    """

    def __init__(self):
        self.is_active = False
        self._setup_logging()
        self.config = self._load_neural_config()
        
        # Initialize Core Components
        self.detector = UniversalDeviceDetector()
        self.memory = None
        self.router = None
        self.quota = None
        self.safety = None
        self.cyber_guard = None
        self.voice = None
        self.vision = None
        self.gateway = None
        self.ui = None

    def _load_neural_config(self):
        """Loads persistent installation config."""
        path = ".neural_config.json"
        if os.path.exists(path):
            with open(path, "r") as f:
                import json
                return json.load(f)
        return {"mode": "admin", "admin_enabled": True}

    def _setup_logging(self):
        """Global structured logging setup."""
        os.makedirs("./logs", exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] [%(name)s] %(message)s',
            handlers=[
                logging.FileHandler("./logs/system_master.log"),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger("ANNY.Master")

    async def bootstrap(self):
        """
        Stage 1: System Bootstrapping. 
        Detects hardware and initializes static configurations.
        """
        neural_print(f"Awakening ANNY NEURAL LINK v{VERSION}...", Colors.GREEN)
        
        # 0. Self-Installation Check
        neural_print("Phase 0: Verifying Neural Dependencies...")
        installer = UniversalInstaller()
        installer.install_all() # This will now be non-blocking or handle checks internally

        # 1. Hardware Profiling
        neural_print("Phase 1: Scanning Hardware Topology...")
        profile = self.detector.detect_all()
        self.detector.print_report()
        
        # 2. Vault and Security Initialization
        neural_print("Phase 2: Synching Cybersecurity Protocols...")
        self.cyber_guard = CybersecurityGuard()
        self.safety = IndustrialSafety()
        
        # 3. Memory & RAG Initialization
        neural_print("Phase 3: Rebuilding Long-Term Memory Vault...")
        self.memory = MemoryEngine()
        
        # 4. Neural Routing & Quota Management
        neural_print("Phase 4: Calibrating Neural Router...")
        self.router = AIRouter(profile)
        self.quota = QuotaGuard()
        
        # 5. Interface Initialization (Vocal/Visual)
        neural_print("Phase 5: Synchronizing Auditory & Visual Cortex...")
        self.voice = VoiceEngine()
        self.vision = VisionEngine()

        neural_print("Bootstrap Sequence Complete.", Colors.GREEN)

    async def initialize_system(self):
        """
        Stage 2: Execution.
        Starts background threads for API Gateway and UI.
        """
        self.is_active = True
        neural_print(f"Initializing Edge Gateway & UI Loop (MODE: {self.config['mode'].upper()})...", Colors.CYAN)
        
        # 1. Start API Gateway in background thread
        self.gateway = APIGateway()
        gateway_thread = threading.Thread(target=self.gateway.run, kwargs={"port": 3000}, daemon=True)
        gateway_thread.start()
        
        # 2. Launch UI Dashboards
        self.ui = UILauncher()
        await asyncio.sleep(2) # Wait for gateway to warm up
        if self.ui.is_server_ready():
            # Pass mode to the UI launcher
            self.ui.launch_web(view=f"?mode={self.config['mode']}")
        
        neural_print("ANNY: ALL SYSTEMS NOMINAL.", Colors.BOLD + Colors.GREEN)
        self.voice.speak_text("System online. Neural pathways established.")

    async def shutdown_system(self):
        """Standard deactivation sequence for industrial safety."""
        neural_print("SHUTDOWN_SIGNAL_DETECTED: Deactivating Neural Pathways...", Colors.YELLOW)
        self.is_active = False
        
        if self.ui: self.ui.shutdown()
        if self.vision: self.vision.release()
        
        neural_print("ANNY OFFLINE. Safe to disconnect.", Colors.RED)

    async def main_loop(self):
        """Primary interaction and telemetry monitor."""
        await self.bootstrap()
        await self.initialize_system()
        
        try:
            while self.is_active:
                # Real-time Telemetry Monitor (Mocked)
                # In production, this would monitor SCADA and sensor streams
                await asyncio.sleep(10)
                
        except KeyboardInterrupt:
            await self.shutdown_system()
        except Exception as e:
            self.logger.error(f"CRITICAL_FAILURE: {str(e)}")
            await self.shutdown_system()

if __name__ == "__main__":
    # Dependency Check: pip install psutil GPUtil py-cpuinfo requests fastapi uvicorn jose passlib bcrypt pyttsx3 SpeechRecognition opencv-python mediapipe chromadb cryptography
    master = Anny()
    asyncio.run(master.main_loop())

# Usage Example:
# python main.py
