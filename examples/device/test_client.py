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
        profile = {"revision": 3, "allowedActions": ["NOD"], "prompt": "test", "formId": "calf"}
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
            async def decide(self, user_input, requested_action=None):
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
