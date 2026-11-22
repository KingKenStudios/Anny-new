"""
ANNY - MODULE 14: NEURAL HELPERS
Description: Global constants, types, and utility snippets.
"""

import time
import datetime
from typing import Any, Dict

# Global System Constants
SYSTEM_NAME = "ANNY"
VERSION = "3.5.0-NEURAL"
OFFLINE_MODE = True

# Colors for Terminal Diagnostics
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def get_iso_timestamp() -> str:
    """Returns standard system timestamp."""
    return datetime.datetime.now().isoformat()

def neural_print(msg: str, color: str = Colors.CYAN):
    """Custom system log formatter."""
    print(f"{color}{Colors.BOLD}[ {SYSTEM_NAME} ]{Colors.END} {msg}")

def measure_latency(func):
    """Decorator to measure neural processing speed."""
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        latency = (end - start) * 1000
        return result, latency
    return wrapper

def sanitize_path(path: str) -> str:
    """Ensures file paths are system-agnostic."""
    return path.replace("\\", "/")

if __name__ == "__main__":
    neural_print("Syncing technical standards...")
    print(f"Version: {VERSION}")
    print(f"Timestamp: {get_iso_timestamp()}")
