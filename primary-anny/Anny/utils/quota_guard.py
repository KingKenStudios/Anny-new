"""
ANNY - MODULE 17: QUOTA & LATENCY GUARD
Filename: quota_guard.py
Description: Prevents API exhaustion by monitoring usage, applying backoffs, 
             and routing to local AI (Ollama) when limits are reached.
"""

import time
import asyncio
import logging
import datetime
from typing import Dict, Any, Optional, Tuple

class QuotaGuard:
    """
    Monitors and manages token usage and API quotas for cloud fallback engines.
    Ensures the system fails gracefully by switching to local inference.
    """

    def __init__(self, tpm_limit: int = 40000, rpm_limit: int = 3):
        self.tpm_limit = tpm_limit  # Tokens Per Minute
        self.rpm_limit = rpm_limit  # Requests Per Minute
        
        self.current_tpm = 0
        self.current_rpm = 0
        self.last_reset = datetime.datetime.now()
        
        self.cooldown_until: Optional[datetime.datetime] = None
        self.backoff_factor = 1.5
        self.retry_count = 0
        
        self._setup_logging()

    def _setup_logging(self):
        log_dir = "./logs/system"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        logging.basicConfig(
            filename=f"{log_dir}/quota.log",
            level=logging.INFO,
            format='%(asctime)s [QUOTA_GUARD] %(message)s'
        )
        self.logger = logging.getLogger("Anny.QuotaGuard")

    def _reset_counters_if_needed(self):
        """Resets the minute-based counters."""
        now = datetime.datetime.now()
        if (now - self.last_reset).total_seconds() > 60:
            self.current_tpm = 0
            self.current_rpm = 0
            self.last_reset = now
            self.logger.info("Counters reset for new minute cycle.")

    def check_quota(self, estimated_tokens: int = 500) -> Tuple[bool, str]:
        """
        Checks if the request can be processed within the current quota.
        Returns: (is_allowed, reason)
        """
        if self.cooldown_until and datetime.datetime.now() < self.cooldown_until:
            return False, "COOLDOWN_ACTIVE"

        self._reset_counters_if_needed()

        if self.current_rpm >= self.rpm_limit:
            return False, "RPM_EXCEEDED"
        
        if self.current_tpm + estimated_tokens > self.tpm_limit:
            return False, "TPM_EXCEEDED"

        return True, "OK"

    def estimate_tokens(self, prompt: str) -> int:
        """Rough estimation of token count (4 chars approx 1 token)."""
        return len(prompt) // 4 + 10 # Buffer for system prompt/overhead

    def log_usage(self, tokens_used: int):
        """Updates the internal counters after a successful API call."""
        self.current_tpm += tokens_used
        self.current_rpm += 1
        self.retry_count = 0 # Reset retry on success
        self.logger.info(f"Usage updated: +{tokens_used} tokens. RPM: {self.current_rpm}")

    def apply_backoff(self, error_type: str):
        """Calculates and applies a cooldown period based on error type."""
        self.retry_count += 1
        wait_seconds = (2 ** self.retry_count) * self.backoff_factor
        self.cooldown_until = datetime.datetime.now() + datetime.timedelta(seconds=wait_seconds)
        self.logger.warning(f"Backoff applied: {error_type}. Cooling down for {wait_seconds}s.")

    async def fallback_to_ollama(self, prompt: str) -> str:
        """
        Redirects the request to the local Ollama manager.
        This provides the offline-first guarantee.
        """
        self.logger.info("ROUTING_FALLBACK: API Quota/Error triggered Local Inference.")
        # Actual implementation would call Module 16 (ollama_manager)
        return f"[LOCAL_BRAIN_ACTIVE] Processing offline fallback for: {prompt[:20]}..."

    def is_quota_exhausted(self, error_msg: str) -> bool:
        """Detects if an error message indicates a quota exhaustion."""
        indicators = ["quota exceeded", "rate limit", "429", "too many requests"]
        return any(ind in error_msg.lower() for ind in indicators)

if __name__ == "__main__":
    import os
    guard = QuotaGuard(rpm_limit=2)
    
    # Test Quota Checks
    print("--- QUOTA GUARD TEST ---")
    allow1, r1 = guard.check_quota(100)
    print(f"Request 1: {allow1} ({r1})")
    guard.log_usage(100)
    
    allow2, r2 = guard.check_quota(100)
    print(f"Request 2: {allow2} ({r2})")
    guard.log_usage(100)
    
    allow3, r3 = guard.check_quota(100)
    print(f"Request 3: {allow3} ({r3})") # Should be RPM_EXCEEDED
    
    # Test Fallback
    if not allow3:
        # async test logic
        import asyncio
        loop = asyncio.get_event_loop()
        fallback_msg = loop.run_until_complete(guard.fallback_to_ollama("System Status Query"))
        print(f"Fallback Output: {fallback_msg}")

# Usage Example:
# from utils.quota_guard import QuotaGuard
# guard = QuotaGuard()
# allowed, reason = guard.check_quota(guard.estimate_tokens(prompt))
# if not allowed:
#     response = await guard.fallback_to_ollama(prompt)
# else:
#     # Try cloud API... catch 429... guard.apply_backoff('QUOTA')...
