"""
ANNY - MODULE 21: UI LAUNCHER & DESKTOP INTEGRATION
Filename: ui_launcher.py
Purpose: Handles the initialization and launching of the desktop (Electron/WebView) 
         and web-based dashboards for the ANNY ecosystem.
"""

import os
import subprocess
import webbrowser
import threading
import time
import logging
import socket
import sys
from typing import Optional, List

class UILauncher:
    """
    Manages the lifecycle of ANNY's visual interfaces. 
    Can trigger local web serving, navigation to specific dashboards, 
    or full Electron-based desktop application windowing.
    """

    def __init__(self, port: int = 3000, host: str = "127.0.0.1"):
        self.port = port
        self.host = host
        self.base_url = f"http://{host}:{port}"
        self.electron_process: Optional[subprocess.Popen] = None
        self._setup_logging()

    def _setup_logging(self):
        """Initializes the UI event log."""
        log_dir = "./logs/ui"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
            
        logging.basicConfig(
            filename=f"{log_dir}/launcher.log",
            level=logging.INFO,
            format='%(asctime)s [UI_LAUNCHER] [%(levelname)s] %(message)s'
        )
        self.logger = logging.getLogger("Anny.UILauncher")

    def launch_web(self, view: str = "", auto_open: bool = True):
        """
        Starts the web-ready dashboard in the user's default browser.
        In the ANNY ecosystem, this anchors to the Neural Gateway.
        """
        target_url = f"{self.base_url}/{view}".strip("/")
        self.logger.info(f"Status: Web Interface requested at {target_url}")
        
        if auto_open:
            try:
                webbrowser.open(target_url)
                print(f"[ UI ] >> Neural Dashboard opened in default browser.")
            except Exception as e:
                self.logger.error(f"Error: Browser open failed: {str(e)}")

    def launch_desktop(self) -> bool:
        """
        Attempts to launch the Electron-based desktop app wrapper.
        Requires Node.js and an Electron configuration in the project root.
        """
        self.logger.info("Status: Desktop Application initialization started.")
        print("[ UI ] >> Initializing ANNY Desktop Environment...")

        try:
            # Check for Electron/Node environment via 'npm start'
            # This allows the Python core to spawn the Electron shell
            cmd = ["npm", "start"]
            
            if os.name == 'nt':  # Windows
                self.electron_process = subprocess.Popen(cmd, shell=True)
            else:  # Linux/Mac
                self.electron_process = subprocess.Popen(cmd)
            
            self.logger.info(f"Desktop process spawned with PID: {self.electron_process.pid}")
            return True
        except Exception as e:
            self.logger.error(f"Error: Desktop launch failed. {str(e)}")
            print(f"[ UI_ERROR ] >> Desktop environment unavailable. Falling back to Web Mode.")
            self.launch_web()
            return False

    def open_dashboard(self, view: str = "telemetry"):
        """Forces navigation to a specific neural view (e.g., scada, diagnostics)."""
        target = f"{self.base_url}/{view}"
        self.logger.info(f"Status: Navigating to neural view '{view}'")
        webbrowser.open(target)

    def is_server_ready(self, timeout: int = 10) -> bool:
        """Wait and verify if the backend server is responding on the UI port."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((self.host, self.port)) == 0:
                    return True
            time.sleep(1)
        return False

    def shutdown(self):
        """Graceful termination of UI processes."""
        if self.electron_process:
            self.logger.info("Status: Terminating Desktop Process.")
            self.electron_process.terminate()
            print("[ UI ] >> Desktop interface deactivated.")

if __name__ == "__main__":
    # Test Routine
    launcher = UILauncher()
    
    print("--- ANNY UI LAUNCHER DIAGNOSTIC ---")
    # Simulate a check before launch
    if launcher.is_server_ready(timeout=2):
        print("Status: Backend reachable.")
        launcher.launch_web()
    else:
        print("Warning: Backend unreachable. Ensure api_gateway.py is running.")
        # Attempting launch anyway for demonstration
        launcher.launch_web(auto_open=True)
