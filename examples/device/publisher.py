"""Non-blocking bridge for an existing local controller; never opens a motor/camera.

Callbacks apply_profile/status/command run on the relay asyncio thread. publish()
may be called from the controller thread. Disconnected events are dropped, not replayed.
"""
import asyncio
import threading
from client import DeviceClient


class _Adapter:
    def __init__(self, owner): self.owner = owner
    @property
    def simulation(self): return self.owner.get_status().get('simulation', True)
    async def status(self): return self.owner.get_status()
    async def apply_profile(self, profile): await self.owner.apply_profile(profile)
    async def stop(self): return {'confirmed': True}  # Transport has no hardware ownership.


class EventPublisher(DeviceClient):
    def __init__(self, relay_url, device_key, *, apply_profile, status, command):
        self.apply_profile, self.get_status, self.on_command = apply_profile, status, command
        self.loop = None
        self.epoch = 0
        self.queue = None
        self.thread = None
        self.main_task = None
        self.last_error = None
        super().__init__(relay_url, device_key, _Adapter(self))

    async def stop_adapter(self):
        # Changing a room or losing Internet must never interrupt local playback.
        self.epoch += 1
        return {'confirmed': True}

    async def command(self, command):
        from client import command_is_current
        if not self.ready or not command_is_current(command, self.profile['revision'], self.seen):
            await self.emit('command.result', commandId=command['commandId'], status='failed', detail='Profile not ready, stale or duplicate command')
            return
        self.seen = (self.seen + [command['commandId']])[-500:]
        try:
            await self.on_command(command)
        except Exception:
            await self.emit('command.result', commandId=command['commandId'], status='failed', detail='Local controller rejected command; check workbench')

    def publish(self, events, revision):
        """Queue one ordered batch without blocking local audio/motion."""
        if not self.loop or not self.ready or not self.profile or self.profile['revision'] != revision:
            return False
        epoch = self.epoch
        def enqueue():
            if epoch == self.epoch and self.ready:
                if self.queue.full():
                    # Losing half a round is worse than a visible reconnect. No replay.
                    self.last_error = 'Event queue full; reconnecting'
                    asyncio.create_task(self.ws.close())
                else:
                    self.queue.put_nowait((epoch, revision, events))
        self.loop.call_soon_threadsafe(enqueue)
        return True

    async def pump(self):
        while True:
            epoch, revision, events = await self.queue.get()
            if epoch != self.epoch or not self.ready or self.profile['revision'] != revision:
                continue
            try:
                for event in events:
                    if epoch != self.epoch: break
                    event = dict(event)
                    await self.emit(event.pop('type'), **event)
            except (ConnectionError, OSError):
                pass

    async def serve(self):
        self.loop = asyncio.get_running_loop()
        self.queue = asyncio.Queue(maxsize=128)
        self.main_task = asyncio.current_task()
        pump = asyncio.create_task(self.pump())
        try:
            await self.run()
        except asyncio.CancelledError:
            pass
        except PermissionError:
            self.last_error = 'Device key rejected; replace COWCOMING_DEVICE_KEY'
        finally:
            pump.cancel()
            await asyncio.gather(pump, return_exceptions=True)
            self.ready = False
            self.loop = None

    def start(self):
        if self.thread: raise RuntimeError('Publisher already started')
        self.thread = threading.Thread(target=lambda: asyncio.run(self.serve()), daemon=True, name='cowcoming-relay')
        self.thread.start()

    def close(self):
        if self.loop and self.main_task:
            self.loop.call_soon_threadsafe(self.main_task.cancel)
        if self.thread: self.thread.join(timeout=3)
