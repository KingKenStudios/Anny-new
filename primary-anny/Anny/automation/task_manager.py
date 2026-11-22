"""
ANNY - MODULE 10: NEURAL WORKFLOW ENGINE
Description: Manages autonomous task scheduling and sequential logic.
"""

import datetime
import json
import uuid
from typing import List, Dict, Any, Callable

class TaskManager:
    def __init__(self):
        self.queue: List[Dict[str, Any]] = []
        self.history: List[Dict[str, Any]] = []

    def schedule_task(self, name: str, action: Callable, priority: int = 1):
        """Adds a neural action to the task synchronization queue."""
        task_id = str(uuid.uuid4())[:8]
        self.queue.append({
            "id": task_id,
            "name": name,
            "action": action,
            "priority": priority,
            "timestamp": datetime.datetime.now().isoformat(),
            "status": "pending"
        })
        print(f"Status: Task '{name}' [{task_id}] queued.")

    def run_cycle(self):
        """Executes one cycle of the priority queue."""
        self.queue.sort(key=lambda x: x["priority"], reverse=True)
        
        while self.queue:
            task = self.queue.pop(0)
            print(f"Status: Executing {task['name']}...")
            try:
                # Perform the mapped action
                task["action"]()
                task["status"] = "complete"
            except Exception as e:
                task["status"] = "failed"
                task["error"] = str(e)
                print(f"Error: Task {task['name']} failed. {str(e)}")
            
            task["completed_at"] = datetime.datetime.now().isoformat()
            self.history.append(task)

    def get_report(self) -> str:
        """Returns a JSON summary of completed neural operations."""
        # Remove direct function references for JSON serialization
        serializable_history = []
        for h in self.history:
            item = h.copy()
            del item["action"]
            serializable_history.append(item)
        return json.dumps(serializable_history, indent=2)

if __name__ == "__main__":
    tm = TaskManager()
    
    # Mock actions
    def scan_vision(): print(">> Neural Vision Active...")
    def check_scada(): print(">> ICS Diagnostic Link Sync...")

    tm.schedule_task("Vision Baseline", scan_vision, priority=2)
    tm.schedule_task("SCADA Integrity", check_scada, priority=1)
    
    tm.run_cycle()
    # print(tm.get_report())
