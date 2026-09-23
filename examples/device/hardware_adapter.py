"""Integration skeleton for the device developer. Safe defaults; no fake completion.

Implement against your verified controller. Start with supportedActions=[] and add
an ID only after direction, limits, stop and completion readback have been tested.
Do not reuse a two-nod preset for NOD or guess servo IDs from browser rotations.
"""
from action_contract import ACTION_CONTRACT_VERSION, validate_profile

class Adapter:
    simulation = False
    async def status(self):
        return {'name':'Unconfigured hardware adapter','hardware':'offline','jev':'offline','language':'offline',
                'actionContractVersion':ACTION_CONTRACT_VERSION,'supportedActions':[]}
    async def apply_profile(self, profile):
        validate_profile(profile)
        raise NotImplementedError('Apply the form prompt to your JEV before acknowledging')
    async def decide(self, user_input, requested_action=None, *, allowed_actions=None):
        raise NotImplementedError('Choose only from allowed_actions; use WAIT when no response is appropriate')
    async def execute(self, action_id):
        return {'status':'unknown','detail':'No real driver has been connected'}
    async def stop(self):
        return {'confirmed':False,'detail':'No controller stop acknowledgement'}
    async def reply(self, user_input):
        raise NotImplementedError('Connect the form-aware LLM here')
        yield ''
