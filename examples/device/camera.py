"""Local camera + HOG person detection. Only WebRTC peers receive frames/boxes.

--test-video produces a labelled synthetic stream, never opens a webcam.
Default ICE has no TURN service and does not send video through Cowcoming.
"""
import asyncio
import json
import time
import cv2
import numpy as np
from av import VideoFrame
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, VideoStreamTrack
from aiortc.contrib.media import MediaRelay
from aiortc.sdp import candidate_from_sdp


class CameraTrack(VideoStreamTrack):
    def __init__(self, publish, index=0, test=False):
        super().__init__()
        self.publish, self.test = publish, test
        self.frame_id = 0
        self.boxes, self.last_detection = [], 0
        self.capture = None if test else cv2.VideoCapture(index)
        if self.capture is not None:
            if not self.capture.isOpened():
                self.capture.release()
                raise RuntimeError('Camera unavailable; check camera index and OS permission')
            self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    def capture_frame(self):
        if self.test:
            frame = np.full((360, 640, 3), (40, 53, 48), dtype=np.uint8)
            x = 220 + int(35 * np.sin(self.frame_id / 25))
            cv2.rectangle(frame, (x, 70), (x + 100, 290), (80, 145, 125), -1)
            cv2.putText(frame, 'SYNTHETIC TEST VIDEO', (20, 32), cv2.FONT_HERSHEY_SIMPLEX, .65, (150, 220, 190), 1)
            self.boxes = [{"id": "test-person", "label": "test target", "bbox": [x / 640, 70 / 360, 100 / 640, 220 / 360]}]
            return frame
        ok, frame = self.capture.read()
        if not ok:
            raise RuntimeError('Camera frame unavailable')
        h, w = frame.shape[:2]
        if w > 640:
            frame = cv2.resize(frame, (640, round(h * 640 / w)))
        if time.monotonic() - self.last_detection > .3:
            rectangles, weights = self.hog.detectMultiScale(frame, winStride=(8, 8), padding=(8, 8), scale=1.08)
            h, w = frame.shape[:2]
            self.boxes = [{"id": str(i), "label": "person", "bbox": [float(x / w), float(y / h), float(bw / w), float(bh / h)]} for i, (x, y, bw, bh) in enumerate(rectangles)]
            self.last_detection = time.monotonic()
        return frame

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        frame = await asyncio.to_thread(self.capture_frame)
        self.frame_id += 1
        self.publish({"type": "detections", "frameId": self.frame_id, "source": "synthetic test" if self.test else "OpenCV HOG on device", "boxes": self.boxes})
        result = VideoFrame.from_ndarray(frame, format='bgr24')
        result.pts, result.time_base = pts, time_base
        return result

    def stop(self):
        super().stop()
        if self.capture is not None:
            self.capture.release()


class CameraPeers:
    def __init__(self, index=0, test=False):
        self.index, self.test = index, test
        self.peers, self.channels, self.pending_ice = {}, {}, {}
        self.track = None
        self.relay = MediaRelay()
        self.send_signal = None
        self.report_status = None

    def publish(self, data):
        payload = json.dumps(data)
        for channel in list(self.channels.values()):
            if channel.readyState == 'open' and channel.bufferedAmount < 32000:
                channel.send(payload)

    async def close_peer(self, peer_id):
        pc = self.peers.pop(peer_id, None)
        self.channels.pop(peer_id, None)
        self.pending_ice.pop(peer_id, None)
        if pc:
            await pc.close()
        if not self.peers and self.track:
            self.track.stop()
            self.track = None

    async def close_peers(self):
        for peer_id in list(self.peers):
            await self.close_peer(peer_id)
        self.pending_ice.clear()

    async def add_ice(self, pc, data):
        if not data.get('candidate'):
            return
        candidate = candidate_from_sdp(data['candidate'].removeprefix('candidate:'))
        candidate.sdpMid = data.get('sdpMid')
        candidate.sdpMLineIndex = data.get('sdpMLineIndex')
        await pc.addIceCandidate(candidate)

    async def handle(self, message):
        peer_id, kind = message['peerId'], message['kind']
        if kind == 'close':
            await self.close_peer(peer_id)
        elif kind == 'ice':
            pc = self.peers.get(peer_id)
            if pc and pc.remoteDescription:
                await self.add_ice(pc, message['candidate'])
            else:
                self.pending_ice.setdefault(peer_id, []).append(message['candidate'])
        elif kind == 'offer':
            pending = self.pending_ice.pop(peer_id, [])
            await self.close_peer(peer_id)
            pc = RTCPeerConnection(RTCConfiguration(iceServers=[]))
            self.peers[peer_id] = pc

            @pc.on('datachannel')
            def channel_open(channel):
                if channel.label == 'perception':
                    self.channels[peer_id] = channel

            @pc.on('connectionstatechange')
            async def state_change():
                if pc.connectionState in ('failed', 'closed') and self.peers.get(peer_id) is pc:
                    await self.close_peer(peer_id)

            try:
                await pc.setRemoteDescription(RTCSessionDescription(sdp=message['sdp'], type='offer'))
                for candidate in pending:
                    await self.add_ice(pc, candidate)
                if self.track is None:
                    self.track = CameraTrack(self.publish, self.index, self.test)
                    if self.report_status:
                        await self.report_status("ready")
                pc.addTrack(self.relay.subscribe(self.track))
                await pc.setLocalDescription(await pc.createAnswer())
                await self.send_signal({"type": "signal", "kind": "answer", "peerId": peer_id, "sdp": pc.localDescription.sdp})
            except Exception as error:
                print('Camera negotiation failed:', type(error).__name__, flush=True)
                if self.report_status:
                    await self.report_status("error")
                await self.close_peer(peer_id)
                await self.send_signal({"type": "signal", "kind": "close", "peerId": peer_id})
