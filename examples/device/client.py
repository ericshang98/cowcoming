"""Minimal Cowcoming device client. Keys never enter logs or browser URLs."""
import asyncio
import json
import time
import uuid
from urllib.parse import urlparse
import aiohttp


def event_id():
    return str(uuid.uuid4())


def command_is_current(command, revision, seen, now=None):
    now = time.time() * 1000 if now is None else now
    return (command.get("commandId") not in seen and command.get("expiresAt", 0) > now
            and (command.get("command") == "stop" or command.get("profileRevision") == revision))


class DeviceClient:
    def __init__(self, relay_url, device_key, adapter, camera=None):
        parsed = urlparse(relay_url)
        if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost")):
            raise ValueError("Use HTTPS or localhost HTTP")
        if not device_key.startswith("cw1.device."):
            raise ValueError("Use a device key, not a browser key")
        self.url, self.key, self.adapter, self.camera = relay_url.rstrip('/'), device_key, adapter, camera
        self.ws = None
        self.profile = None
        self.seen = []
        self.tasks = set()
        self.ready = False
        self.last_received = 0

    async def emit(self, event_type, **data):
        if self.ws is None or self.ws.closed:
            raise ConnectionError("Relay disconnected")
        await self.ws.send_json({"type": event_type, "eventId": event_id(), **data})

    async def send_signal(self, data):
        if self.ws and not self.ws.closed:
            await self.ws.send_json(data)

    async def heartbeat(self):
        while True:
            await asyncio.sleep(10)
            if time.monotonic() - self.last_received > 30:
                await self.ws.close()
                return
            await self.ws.send_json({"type": "ping"})

    async def cancel_actions(self):
        tasks = list(self.tasks)
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self.tasks.clear()

    async def stop_adapter(self):
        await self.cancel_actions()
        # A real adapter must stop its motion controller here and return evidence.
        return await self.adapter.stop()

    async def command(self, command):
        command_id = command.get("commandId")
        if not command_is_current(command, self.profile["revision"] if self.profile else None, self.seen):
            await self.emit("command.result", commandId=command_id, status="failed", detail="Expired, duplicate or stale-profile command")
            return
        self.seen = (self.seen + [command_id])[-500:]
        if command["command"] == "stop":
            result = await self.stop_adapter()
            await self.emit("command.result", commandId=command_id, status="stopped" if result.get("confirmed") else "unknown", detail=result.get("detail", "No stop confirmation"))
            return
        if not self.ready or self.tasks:
            await self.emit("command.result", commandId=command_id, status="failed", detail="Device is busy or profile is not ready; retry explicitly")
            return
        revision = self.profile["revision"]
        allowed = list(self.profile["allowedActions"])
        task = asyncio.create_task(self.interact(command, revision, allowed))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def interact(self, command, revision, allowed):
        decision_id = None
        message_id = None
        action_final = False
        try:
            await self.emit("command.result", commandId=command["commandId"], status="accepted", detail="Local process accepted")
            user_input = command.get("input", "")
            if user_input:
                mid = event_id()
                await self.emit("language.start", messageId=mid, commandId=command["commandId"], role="user", text=user_input)
                await self.emit("language.end", messageId=mid)
            decision = await self.adapter.decide(user_input, command.get("actionId"))
            if self.profile["revision"] != revision or decision["actionId"] not in allowed:
                raise ValueError("JEV chose an unavailable action or the profile changed")
            decision_id = event_id()
            await self.emit("decision", decisionId=decision_id, commandId=command["commandId"], profileRevision=revision, actionId=decision["actionId"], summary=decision.get("summary", ""))
            await self.emit("action", decisionId=decision_id, status="started", detail="Local adapter started")
            result = await self.adapter.execute(decision["actionId"])
            await self.emit("action", decisionId=decision_id, status=result["status"], detail=result.get("detail", ""))
            action_final = result["status"] in ("completed", "failed", "interrupted")
            if user_input:
                message_id = event_id()
                await self.emit("language.start", messageId=message_id, commandId=command["commandId"], role="assistant", text="")
                async for chunk in self.adapter.reply(user_input):
                    await self.emit("language.delta", messageId=message_id, text=chunk)
                await self.emit("language.end", messageId=message_id)
            completed = result["status"] == "completed"
            await self.emit("command.result", commandId=command["commandId"], status="completed" if completed else "unknown", detail="Interaction complete" if completed else "Hardware completion not confirmed")
        except asyncio.CancelledError:
            if self.ws and not self.ws.closed:
                if decision_id and not action_final:
                    await self.emit("action", decisionId=decision_id, status="interrupted", detail="Local task interrupted; check stop confirmation")
                if message_id:
                    await self.emit("language.end", messageId=message_id, status="interrupted")
                await self.emit("command.result", commandId=command["commandId"], status="interrupted", detail="Interrupted locally")
            raise
        except Exception as error:
            if self.ws and not self.ws.closed:
                if decision_id and not action_final:
                    await self.emit("action", decisionId=decision_id, status="unknown", detail=type(error).__name__)
                if message_id:
                    await self.emit("language.end", messageId=message_id, status="failed")
                await self.emit("command.result", commandId=command["commandId"], status="failed", detail=type(error).__name__)

    async def run(self):
        delay = 1
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:
            while True:
                beat = None
                try:
                    async with session.post(self.url + '/v1/connect', headers={"Authorization": "Bearer " + self.key}) as response:
                        if response.status in (400, 401, 403):
                            raise PermissionError("Device key rejected")
                        response.raise_for_status()
                        ticket = await response.json()
                    ws_url = self.url.replace('https:', 'wss:', 1).replace('http:', 'ws:', 1) + '/v1/socket/' + ticket['roomId'] + '?ticket=' + ticket['ticket']
                    async with session.ws_connect(ws_url, max_msg_size=100000) as ws:
                        self.ws, self.last_received, delay = ws, time.monotonic(), 1
                        self.ready = False
                        if self.camera:
                            self.camera.send_signal = self.send_signal
                            self.camera.report_status = lambda status: self.emit("device.status", camera=status)
                        beat = asyncio.create_task(self.heartbeat())
                        print('Connected to device room', ticket['roomId'], flush=True)
                        await self.emit("device.status", **await self.adapter.status(), camera="unknown" if self.camera else "offline", simulation=bool(self.adapter.simulation))
                        async for frame in ws:
                            if frame.type != aiohttp.WSMsgType.TEXT:
                                continue
                            self.last_received = time.monotonic()
                            message = json.loads(frame.data)
                            if message['type'] == 'profile':
                                self.ready = False
                                stopped = await self.stop_adapter()
                                if not stopped.get("confirmed"):
                                    await self.emit("log", text="Profile not applied: local stop is not confirmed")
                                    continue
                                await self.adapter.apply_profile(message['profile'])
                                self.profile = message['profile']
                                await self.emit('profile.applied', revision=self.profile['revision'])
                                self.ready = True
                            elif message['type'] == 'command':
                                await self.command(message)
                            elif message['type'] == 'signal' and self.camera:
                                await self.camera.handle(message)
                            elif message['type'] == 'error':
                                print('Relay rejected a message:', message.get('error'), flush=True)
                except PermissionError:
                    raise
                except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as error:
                    # Do not print exception URLs: they may contain a short-lived ticket.
                    print('Relay disconnected:', type(error).__name__, flush=True)
                finally:
                    self.ready = False
                    if beat:
                        beat.cancel()
                        await asyncio.gather(beat, return_exceptions=True)
                    await self.stop_adapter()
                    if self.camera:
                        await self.camera.close_peers()
                    self.ws = None
                await asyncio.sleep(delay)
                delay = min(delay * 2, 10)
