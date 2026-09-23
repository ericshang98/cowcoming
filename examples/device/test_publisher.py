import asyncio
import unittest
from publisher import EventPublisher
from client import DeviceClient
from test_client import FakeSocket
from adapter import ExampleAdapter

class PublisherTests(unittest.IsolatedAsyncioTestCase):
    async def test_ordered_batches_and_disconnect_drop(self):
        async def noop(*_): pass
        p=EventPublisher('http://127.0.0.1:1','cw1.device.test.'+'a'*64,apply_profile=noop,status=lambda:{},command=noop)
        p.loop=asyncio.get_running_loop();p.queue=asyncio.Queue(maxsize=128);p.ws=FakeSocket();p.profile={'revision':1};p.ready=True
        pump=asyncio.create_task(p.pump())
        try:
            self.assertTrue(p.publish([{'type':'log','text':'one'},{'type':'log','text':'two'}],1))
            await asyncio.sleep(.01)
            self.assertEqual([e['text'] for e in p.ws.messages],['one','two'])
            p.publish([{'type':'log','text':'old'}],1)
            await p.stop_adapter()
            await asyncio.sleep(.01)
            self.assertEqual(len(p.ws.messages),2)
            p.ready=False
            self.assertFalse(p.publish([{'type':'log','text':'offline'}],1))
        finally:
            pump.cancel();await asyncio.gather(pump,return_exceptions=True)
    async def test_language_starts_before_motion_finishes(self):
        started=asyncio.Event()
        class Parallel(ExampleAdapter):
            async def execute(self,action_id):
                await asyncio.wait_for(started.wait(),.5)
                return {'status':'completed'}
            async def reply(self,text):
                started.set()
                yield 'hello'
        client=DeviceClient('http://127.0.0.1:1','cw1.device.test.'+'a'*64,Parallel())
        client.profile={'revision':1};client.ws=FakeSocket()
        await client.interact({'commandId':'one','input':'hello','actionId':'NOD'},1,['NOD'])
        self.assertEqual(client.ws.messages[-1]['status'],'completed')
