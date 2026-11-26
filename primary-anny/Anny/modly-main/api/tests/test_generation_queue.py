import asyncio
import unittest

from services.generation_queue import GenerationQueue


class GenerationQueueTests(unittest.IsolatedAsyncioTestCase):
    async def test_serializes_shared_model_jobs_and_clears_owner(self):
        queue = GenerationQueue()
        active = 0
        peak_active = 0
        order = []

        async def make_job(job_id):
            async def execute():
                nonlocal active, peak_active
                self.assertEqual(queue.active_job_id, job_id)
                active += 1
                peak_active = max(peak_active, active)
                order.append(f"start:{job_id}")
                await asyncio.sleep(0.01)
                order.append(f"end:{job_id}")
                active -= 1
            return await queue.run(job_id, lambda: False, execute)

        results = await asyncio.gather(make_job("a"), make_job("b"), make_job("c"))
        self.assertEqual(results, [True, True, True])
        self.assertEqual(peak_active, 1)
        self.assertEqual(queue.active_job_id, None)
        for index in range(0, len(order), 2):
            self.assertTrue(order[index].startswith("start:"))
            self.assertTrue(order[index + 1].startswith("end:"))

    async def test_cancelled_waiting_job_is_skipped_without_becoming_owner(self):
        queue = GenerationQueue()
        entered = asyncio.Event()
        release = asyncio.Event()
        queued_cancelled = False
        queued_executed = False

        async def active_job():
            async def execute():
                entered.set()
                await release.wait()
            return await queue.run("active", lambda: False, execute)

        async def queued_job():
            async def execute():
                nonlocal queued_executed
                queued_executed = True
            return await queue.run("queued", lambda: queued_cancelled, execute)

        active_task = asyncio.create_task(active_job())
        await entered.wait()
        queued_task = asyncio.create_task(queued_job())
        await asyncio.sleep(0)
        queued_cancelled = True
        release.set()

        self.assertTrue(await active_task)
        self.assertFalse(await queued_task)
        self.assertFalse(queued_executed)
        self.assertEqual(queue.active_job_id, None)

    async def test_active_owner_is_only_visible_during_its_execution(self):
        queue = GenerationQueue()
        self.assertIsNone(queue.active_job_id)

        async def execute():
            self.assertEqual(queue.active_job_id, "owner")
            await asyncio.sleep(0)

        self.assertTrue(await queue.run("owner", lambda: False, execute))
        self.assertIsNone(queue.active_job_id)


if __name__ == "__main__":
    unittest.main()
