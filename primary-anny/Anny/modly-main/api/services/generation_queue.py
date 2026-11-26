"""Async job serialization for shared local model/generator resources."""
import asyncio
from typing import Awaitable, Callable


class GenerationQueue:
    """Serializes jobs and exposes the active owner for safe targeted cancellation."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._active_job_id: str | None = None

    @property
    def active_job_id(self) -> str | None:
        return self._active_job_id

    async def run(
        self,
        job_id: str,
        is_cancelled: Callable[[], bool],
        execute: Callable[[], Awaitable[None]],
    ) -> bool:
        """Run one job exclusively; skip it if cancelled while waiting in the queue."""
        async with self._lock:
            if is_cancelled():
                return False
            self._active_job_id = job_id
            try:
                await execute()
                return True
            finally:
                if self._active_job_id == job_id:
                    self._active_job_id = None
