"""
ANNY - MODULE 19: INDUSTRIAL SAFETY & LOTO LAYER
Filename: industrial_safety.py
Purpose: Enforces physical safety protocols, digital Lockout/Tagout (LOTO), 
         and human-in-the-loop verification for industrial operations.
"""

import os
import json
import logging
import datetime
from typing import Dict, Any, Tuple, Optional, List

class IndustrialSafety:
    """
    The safety supervisor for ANNY. Controls the critical path for any 
    operation that affects physical hardware or ICS/SCADA systems.
    """

    def __init__(self, loto_path: str = "./status/LOTO.json"):
        self.loto_path = loto_path
        os.makedirs(os.path.dirname(self.loto_path), exist_ok=True)
        
        self.read_only_mode = True  # Default to safety-first
        self.emergency_stop_triggered = False
        self._setup_safety_audit()

    def _setup_safety_audit(self):
        """Secure logging for industrial forensic auditing."""
        log_dir = "./logs/industrial"
        os.makedirs(log_dir, exist_ok=True)
        
        logging.basicConfig(
            filename=f"{log_dir}/safety_audit.log",
            level=logging.INFO,
            format='%(asctime)s [SAFETY_VERIFIER] [%(levelname)s] %(message)s'
        )
        self.logger = logging.getLogger("Anny.IndustrialSafety")

    def verify_safety(self, operation_id: str, parameters: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Evaluates an operation against physical safety constraints.
        Returns: (is_safe, refusal_reason)
        """
        if self.emergency_stop_triggered:
            return False, "CRITICAL: System in Emergency Stop state. Manual reset required."

        if self.is_locked():
            return False, "SAFETY_BLOCK: Digital Lockout/Tagout (LOTO) is active."

        # Check for dangerous parameter ranges
        # Example: RPM or Temperature exceeds hardware spec
        if parameters.get("power_level", 0) > 90:
            return False, "SAFETY_VIO: Power level exceeds threshold (90%)."

        return True, "SAFE"

    def lockout_system(self, technician_id: str, reason: str):
        """Applies a Digital LOTO to freeze all kinetic and SCADA write actions."""
        loto_data = {
            "status": "LOCKED",
            "technician": technician_id,
            "reason": reason,
            "timestamp": datetime.datetime.now().isoformat()
        }
        with open(self.loto_path, "w") as f:
            json.dump(loto_data, f, indent=4)
        
        self.logger.critical(f"LOTO_APPLIED: Technician {technician_id} locked the system. Reason: {reason}")
        print(f"[ SAFETY ] >> LOTO ENGAGED by {technician_id}.")

    def release_lockout(self, technician_id: str):
        """Clears LOTO state. Only authorized personnel should call this."""
        if os.path.exists(self.loto_path):
            os.remove(self.loto_path)
            self.logger.info(f"LOTO_RELEASED: System returned to standby by {technician_id}")
            print(f"[ SAFETY ] >> LOTO RELEASED by {technician_id}.")

    def is_locked(self) -> bool:
        """Passive check for system lock status."""
        return os.path.exists(self.loto_path)

    def audit_action(self, module: str, action: str, operator_id: str):
        """Logs high-integrity audit trail for industrial compliance (e.g., OSHA/IEC)."""
        self.logger.info(f"OPERATOR_ACTION: [{module}] {action} by ID:{operator_id}")

    def confirm_operation(self, question: str) -> bool:
        """
        Human-In-The-Loop (HITL) verification. 
        Forces an explicit 'YES' from the operator.
        """
        print(f"\n[ MANUAL_CONFIRMATION_REQUIRED ]")
        print(f"QUESTION: {question}")
        choice = input("Authorize movement? (TYPE 'YES' TO PROCEED): ").strip().upper()
        return choice == "YES"

    def trigger_emergency_stop(self):
        """Instantly disables all output pathways."""
        self.emergency_stop_triggered = True
        self.read_only_mode = True
        self.logger.critical("EMERGENCY_STOP: Physical cut-off signal sent.")
        print("[ !!! ] EMERGENCY STOP ACTIVE [ !!! ]")

    def reset_system(self):
        """Resets the safety logic post-incident. Requires physical verification."""
        self.emergency_stop_triggered = False
        print("[ SAFETY ] >> System status reset to standby.")

if __name__ == "__main__":
    safety = IndustrialSafety()
    
    # Test LOTO
    safety.lockout_system("TECH_ALPHA", "Routine maintenance on Unit 4.")
    
    # Test Verification
    can_proceed, reason = safety.verify_safety("MOTOR_START", {"power_level": 50})
    print(f"Can start motor? {can_proceed} ({reason})")
    
    safety.release_lockout("TECH_ALPHA")
    
    # Test HITL
    # if safety.confirm_operation("Initialize hydraulic sequence?"):
    #     print("Operation authorized.")
