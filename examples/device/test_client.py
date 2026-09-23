import unittest
from client import command_is_current

class Commands(unittest.TestCase):
    def test_expired_and_duplicate_commands_never_run(self):
        c = {"command": "action", "commandId": "one", "expiresAt": 100, "profileRevision": 2}
        self.assertTrue(command_is_current(c, 2, [], 90))
        self.assertFalse(command_is_current(c, 2, [], 100))
        self.assertFalse(command_is_current(c, 2, ["one"], 90))
        self.assertFalse(command_is_current(c, 1, [], 90))

    def test_stop_survives_profile_mismatch(self):
        self.assertTrue(command_is_current({"command": "stop", "commandId": "s", "expiresAt": 100}, None, [], 90))


from client import DeviceClient
from adapter import ExampleAdapter

class FakeSocket:
    closed = False
    def __init__(self):
        self.messages = []
    async def send_json(self, data):
        self.messages.append(data)

class Runtime(unittest.IsolatedAsyncioTestCase):
    async def test_example_emits_profile_bound_decision_action_and_stream(self):
        adapter = ExampleAdapter()
        profile = {"actionContractVersion": 2, "animationMap": {"NOD":["nod-soft"]}, "revision": 3, "allowedActions": ["NOD"], "prompt": "test", "formId": "calf"}
        await adapter.apply_profile(profile)
        client = DeviceClient('http://127.0.0.1:8794', 'cw1.device.test.' + 'a' * 64, adapter)
        client.ws = FakeSocket()
        client.profile = profile
        await client.interact({"commandId": "c", "input": "hello"}, 3, ['NOD'])
        events = client.ws.messages
        self.assertTrue(all(e.get("commandId") == "c" for e in events if e["type"] == "language.start"))
        self.assertEqual(next(e for e in events if e['type'] == 'decision')['profileRevision'], 3)
        self.assertEqual(next(e for e in events if e['type'] == 'action' and e['status'] == 'completed')['detail'], 'Simulation finished; no hardware moved.')
        self.assertEqual(events[-1]['status'], 'completed')
        self.assertTrue(any(e['type'] == 'language.delta' for e in events))

    async def test_model_cannot_return_an_unknown_action(self):
        class BadDecision(ExampleAdapter):
            async def decide(self, user_input, requested_action=None, *, allowed_actions=None):
                return {"actionId": "EXEC", "summary": "reject"}
            async def execute(self, action_id):
                raise AssertionError('must not execute')
        adapter = BadDecision()
        client = DeviceClient('http://127.0.0.1:8794', 'cw1.device.test.' + 'a' * 64, adapter)
        client.ws = FakeSocket()
        client.profile = {"revision": 1}
        await client.interact({"commandId": "c"}, 1, ['NOD'])
        self.assertFalse(any(e['type'] == 'decision' for e in client.ws.messages))
        self.assertEqual(client.ws.messages[-1]['status'], 'failed')

if __name__ == '__main__':
    unittest.main()

class Contract(unittest.IsolatedAsyncioTestCase):
    async def test_unconfigured_hardware_never_claims_motion_or_stop(self):
        from hardware_adapter import Adapter
        adapter = Adapter()
        self.assertEqual((await adapter.status())['supportedActions'], [])
        self.assertEqual((await adapter.status())['hardware'], 'offline')
        self.assertFalse((await adapter.stop())['confirmed'])
        self.assertEqual((await adapter.execute('NOD'))['status'], 'unknown')

    async def test_capability_intersection_and_semantics(self):
        from action_contract import validate_profile, executable_actions
        p={'actionContractVersion':2,'formId':'calf','allowedActions':['NOD','TILT_LEFT','WAIT'],'animationMap':{'NOD':['nod-soft'],'TILT_LEFT':['tilt-left'],'WAIT':['idle']}}
        self.assertEqual(executable_actions(p,{'actionContractVersion':2,'hardware':'ready','supportedActions':['NOD']}),['NOD','WAIT'])
        self.assertEqual(executable_actions(p,{'actionContractVersion':2,'hardware':'offline','supportedActions':['NOD']}),['WAIT'])
        p['animationMap']['NOD']=['nod-double']
        with self.assertRaises(ValueError): validate_profile(p)

class PersonaAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_example_loads_six_personas_and_returns_actual_version(self):
        from adapter import ExampleAdapter
        from pathlib import Path
        import json
        data_path = Path(__file__).with_name('niulai-personas.json')
        if not data_path.exists(): data_path = Path(__file__).resolve().parents[2]/'shared/niulai-personas.json'
        catalog = json.loads(data_path.read_text())
        from action_contract import ACTION_ANIMATIONS, ACTION_IDS
        for form in catalog['forms']:
            adapter = ExampleAdapter()
            profile = {'revision':1,'actionContractVersion':2,'formId':form,'prompt':'偏好',
                       'allowedActions':list(ACTION_IDS),'animationMap':ACTION_ANIMATIONS,
                       'personaVersion':catalog['prompt_version']}
            receipt = await adapter.apply_profile(profile)
            self.assertEqual(receipt, {'formId':form,'personaVersion':catalog['prompt_version']})
            self.assertEqual(adapter.persona, catalog['forms'][form])
            with self.assertRaises(ValueError):
                await adapter.apply_profile({**profile,'personaVersion':'stale'})
