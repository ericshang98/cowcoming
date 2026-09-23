import argparse
import asyncio
import importlib
import os
from adapter import ExampleAdapter
from client import DeviceClient


def main():
    parser = argparse.ArgumentParser(description='Cowcoming local device adapter')
    parser.add_argument('--adapter', help='Python module:Class implementing the adapter methods')
    parser.add_argument('--camera', type=int, help='OpenCV webcam index; camera opens only when a viewer starts video')
    parser.add_argument('--test-video', action='store_true', help='Synthetic labelled WebRTC stream, no webcam access')
    args = parser.parse_args()
    adapter = ExampleAdapter()
    if args.adapter:
        module, cls = args.adapter.split(':', 1)
        adapter = getattr(importlib.import_module(module), cls)()
    camera = None
    if args.camera is not None or args.test_video:
        from camera import CameraPeers
        camera = CameraPeers(index=args.camera or 0, test=args.test_video)
    try:
        client = DeviceClient(os.environ['COWCOMING_RELAY_URL'], os.environ['COWCOMING_DEVICE_KEY'], adapter, camera)
        asyncio.run(client.run())
    except KeyError:
        parser.error('Set COWCOMING_RELAY_URL and COWCOMING_DEVICE_KEY in the environment')
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
