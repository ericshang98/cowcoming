"""Replace this adapter with your JEV, arm driver and local LLM implementation.

No motor commands are included. ExampleAdapter is explicitly a simulation.
"""
import asyncio


class ExampleAdapter:
    simulation = True

    async def status(self):
        return {"name": "Python example", "hardware": "unknown", "jev": "ready", "language": "ready"}

    async def apply_profile(self, profile):
        self.profile = profile

    async def decide(self, user_input, requested_action=None):
        allowed = self.profile["allowedActions"]
        action = requested_action or ("NOD" if "NOD" in allowed else allowed[0])
        return {"actionId": action, "summary": "Simulation adapter chose a mapped action. Replace decide() with your local JEV call."}

    async def execute(self, action_id):
        await asyncio.sleep(.25)
        return {"status": "completed", "detail": "Simulation finished; no hardware moved."}

    async def stop(self):
        return {"confirmed": True, "detail": "Simulation stopped; no hardware is attached."}

    async def reply(self, user_input):
        for chunk in ["[Local example] ", "Received: ", user_input, ". Replace reply() with your LLM stream."]:
            yield chunk
            await asyncio.sleep(.08)
