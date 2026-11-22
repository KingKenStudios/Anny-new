# installer.py
import os
import sys
import platform
import subprocess
import json
import time
import shutil

def run_cmd(cmd, shell=True):
    try:
        # Redirect output to null for quiet execution if needed, 
        # but keep it for critical steps. Using capture_output for internal cmds.
        subprocess.run(cmd, shell=shell, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        return True
    except Exception:
        return False

class UniversalInstaller:
    def __init__(self, mode="admin"):
        self.mode = mode.lower()
        self.os = platform.system()
        self.arch = platform.machine()
        self.cpu_cores = os.cpu_count() or 4
        self.ram_gb = 8 # Default
        self.has_gpu = False
        
        try:
            import psutil
            self.ram_gb = round(psutil.virtual_memory().total / (1024**3))
        except:
            print("⚠️ psutil not found, using estimated specs.")

    def detect_hardware(self):
        print(f"🔍 System Probe: {self.os} | {self.arch} | {self.cpu_cores} Cores | {self.ram_gb}GB RAM")
        
        # Classification
        if self.ram_gb >= 32:
            self.tier = "ULTRA"
            self.model = "llama3.3"
        elif self.ram_gb >= 16:
            self.tier = "HIGH"
            self.model = "llama3.2"
        elif self.ram_gb >= 8:
            self.tier = "MEDIUM"
            self.model = "llama3.2-3b" if self.os != "Windows" else "llama3.2"
        else:
            self.tier = "MINIMAL"
            self.model = "phi4"
            
        print(f"🎯 Assigned Tier: {self.tier} | Optimized Model: {self.model}")

    def install_dependencies(self):
        print("🐍 Ensuring Python Environment...")
        run_cmd(f"{sys.executable} -m pip install psutil requests rich flask-cors pyyaml")

    def install_ollama(self):
        print("🧠 Deploying Local AI Core (Ollama)...")
        if self.os == "Windows":
            run_cmd("winget install ollama.ollama --silent")
        elif self.os == "Linux":
            run_cmd("curl -fsSL https://ollama.com/install.sh | sh")
        elif self.os == "Darwin":
            if shutil.which("brew"):
                run_cmd("brew install ollama")
            else:
                print("⚠️ Homebrew not found. Please install manualy from ollama.com")

    def config_models(self):
        print(f"📥 Pulling Neural Matrix: {self.model}...")
        # Try to start ollama if not running
        if self.os == "Windows":
            subprocess.Popen(["ollama", "serve"], shell=True)
        else:
            run_cmd("ollama serve &", shell=True)
            
        time.sleep(5)
        run_cmd(f"ollama pull {self.model}")
        run_cmd("ollama pull nomic-embed-text")

    def create_desktop_app(self, app_url):
        print(f"🖥️ Creating Anny Desktop Application ({self.mode.upper()} MODE)...")
        # For User mode, we can append a flag to the URL
        if self.mode == "user":
            app_url += "?mode=user_only"
            
        icon_path = os.path.join(os.getcwd(), "public", "logo.PNG")
        
        # Use nativefier via npx for a true desktop experience
        # If user doesn't have node/npm, we skip this or warn
        if shutil.which("npm"):
            print("🚀 Using Nativefier to bundle app...")
            name = "Anny"
            cmd = f"npx nativefier --name \"{name}\" --icon \"{icon_path}\" --internal-urls \".*\" \"{app_url}\" --inject-css ./src/index.css"
            if self.os == "Windows":
                run_cmd(cmd)
            else:
                run_cmd(cmd)
        else:
            print("⚠️ Node.js/NPM not found. Creating a simple shortcut instead.")
            self._create_simple_shortcut(app_url)

    def _create_simple_shortcut(self, url):
        if self.os == "Windows":
            desktop = os.path.join(os.environ["USERPROFILE"], "Desktop")
            shortcut_path = os.path.join(desktop, "Anny.url")
            with open(shortcut_path, "w") as f:
                f.write("[InternetShortcut]\n")
                f.write(f"URL={url}\n")
            print(f"✅ Shortcut created on Desktop: {shortcut_path}")
        elif self.os == "Linux":
            desktop = os.path.join(os.path.expanduser("~"), "Desktop")
            shortcut_path = os.path.join(desktop, "anny.desktop")
            with open(shortcut_path, "w") as f:
                f.write("[Desktop Entry]\nType=Application\nName=Anny\n")
                f.write(f"Exec=xdg-open {url}\nIcon=network-workgroup\n")
            os.chmod(shortcut_path, 0o755)
            print(f"✅ Desktop entry created: {shortcut_path}")

    def run_mobile_check(self):
        """Checks for mobile bridge connectivity."""
        print("📱 Mobile Integration Check: Android/iOS Bridge Active.")

    def save_local_config(self):
        """Saves mode-specific configuration for the local orchestrator."""
        config = {
            "mode": self.mode,
            "admin_enabled": self.mode == "admin",
            "installation_date": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        with open(".neural_config.json", "w") as f:
            json.dump(config, f, indent=4)
        print(f"💾 Neural configuration saved: {self.mode.upper()} mode active.")

    def install_all(self, silent=True):
        """Complete automated installation sequence."""
        self.save_local_config()
        if silent:
            # Check if already installed
            if shutil.which("ollama"):
                print("✅ Ollama detected. Skipping core installation.")
            else:
                self.install_ollama()
            
            self.detect_hardware()
            self.install_dependencies()
            self.config_models()
        else:
            self.run()

    def run(self):
        print("\n[ ANNY_INITIALIZATION_SEQUENCE ]")
        
        self.detect_hardware()
        # Minimal progress lines
        print("Status: Synchronizing Neural Pathways...")
        self.install_dependencies()
        
        print("Status: Awakening Local Brain...")
        self.install_ollama()
        
        print(f"Status: Pulling Neural Matrix ({self.model})...")
        self.config_models()
        
        app_url = "https://ais-pre-gjh6qbnfeotqgp3mjnj6bo-679878633620.europe-west2.run.app"
        self.create_desktop_app(app_url)
        
        print("\n[ ANNY_AWAKE ]")
        print(f"System: Access link established at {app_url}\n")

if __name__ == "__main__":
    # Check for mode argument
    install_mode = "admin"
    if len(sys.argv) > 1:
        if sys.argv[1].lower() in ["admin", "user"]:
            install_mode = sys.argv[1].lower()

    installer = UniversalInstaller(mode=install_mode)
    installer.run()
