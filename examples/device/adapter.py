"""Replace this adapter with your JEV, arm driver and local LLM implementation.

No motor commands are included. ExampleAdapter is explicitly a simulation.
"""
import asyncio
import json
from pathlib import Path
from action_contract import ACTION_CONTRACT_VERSION, ACTION_IDS, validate_profile


class ExampleAdapter:
    simulation = True

    async def status(self):
        return {"name": "Python example", "hardware": "ready", "jev": "ready", "language": "ready", "actionContractVersion": ACTION_CONTRACT_VERSION, "supportedActions": sorted(ACTION_IDS)}

    async def apply_profile(self, profile):
        validate_profile(profile)
        data_path = Path(__file__).with_name('niulai-personas.json')
        if not data_path.exists():
            data_path = Path(__file__).resolve().parents[2] / 'shared/niulai-personas.json'
        catalog = json.loads(data_path.read_text())
        if profile.get('personaVersion') and profile['personaVersion'] != catalog['prompt_version']:
            raise ValueError('Persona version mismatch')
        self.persona = catalog['forms'][profile['formId']]
        self.profile = profile
        return {'formId': profile['formId'], 'personaVersion': catalog['prompt_version']}

    async def decide(self, user_input, requested_action=None, *, allowed_actions=None):
        allowed = allowed_actions if allowed_actions is not None else self.profile["allowedActions"]
        action = requested_action or ("NOD" if "NOD" in allowed else allowed[0])
        return {"actionId": action, "summary": "Simulation adapter chose a mapped action. Replace decide() with your local JEV call."}

    async def execute(self, action_id):
        if action_id not in ACTION_IDS: raise ValueError("Unknown action")
        await asyncio.sleep(.25)
        return {"status": "completed", "detail": "Simulation finished; no hardware moved."}

    async def stop(self):
        return {"confirmed": True, "detail": "Simulation stopped; no hardware is attached."}

    async def reply(self, user_input):
        for chunk in ["[Local example] ", "Received: ", user_input, ". Replace reply() with your LLM stream."]:
            yield chunk
            await asyncio.sleep(.08)
