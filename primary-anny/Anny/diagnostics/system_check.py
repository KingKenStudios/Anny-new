"""
ANNY - MODULE 13: SYSTEM HEALTH & LOTO
Description: Comprehensive diagnostic checks and safety locking.
"""

import os
import platform
import subprocess
from typing import Dict, Any

class SafetyDiagnostics:
    def __init__(self):
        self.lock_file = "./status/LOTO.lock"
        os.makedirs(os.path.dirname(self.lock_file), exist_ok=True)

    def run_full_diagnostic(self) -> Dict[str, Any]:
        """Performs a 4-point system check."""
        results = {
            "os": platform.system(),
            "version": platform.release(),
            "neural_link": self._check_neural_link(),
            "storage_integrity": self._check_disk(),
            "loto_status": "LOCKED" if self.is_locked() else "ACTIVE"
        }
        return results

    def _check_neural_link(self) -> str:
        """Verifies if the local inference engine is responding."""
        try:
            # Simple check if ollama is reachable via CLI
            subprocess.run(["ollama", "--version"], capture_output=True, check=True)
            return "READY"
        except Exception:
            return "UNAVAILABLE"

    def _check_disk(self) -> str:
        """Checks for database space availability."""
        usage = os.statvfs('/') if hasattr(os, 'statvfs') else None
        if usage:
            free_gb = (usage.f_bavail * usage.f_frsize) / (1024**3)
            return "HEALTHY" if free_gb > 1.0 else "LOW_SPACE"
        return "UNKNOWN"

    def apply_loto(self, technician_id: str):
        """Applies a digital safety lock."""
        with open(self.lock_file, "w") as f:
            f.write(f"USER:{technician_id}\nLOCKED_AT:{platform.node()}")
        print(f"Status: DIGITAL LOTO APPLIED BY {technician_id}")

    def release_loto(self):
        """Releases the system to active state."""
        if os.path.exists(self.lock_file):
            os.remove(self.lock_file)
            print("Status: LOTO RELEASED. SYSTEM ACTIVE.")

    def is_locked(self) -> bool:
        """Checks if the system is safe for movement."""
        return os.path.exists(self.lock_file)

if __name__ == "__main__":
    diag = SafetyDiagnostics()
    print("--- ANNY DIAGNOSTIC SUITE ---")
    report = diag.run_full_diagnostic()
    for k, v in report.items():
        print(f"{k.upper()}: {v}")
    
    diag.apply_loto("TECH_01")
    print(f"Verified Lock: {diag.is_locked()}")
    diag.release_loto()
