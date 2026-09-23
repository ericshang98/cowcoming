import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from local_preview import create_server, loopback_url, token_from_file


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        def provider():
            self.calls.append(1)
            return {'frameId': 3, 'ageMs': 0, 'jpeg': '/9j/AA=='}
        self.token = 'a' * 48
        self.server = create_server(provider, token=self.token, origins=['https://cowcoming.world'], port=0)
        self.worker = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.worker.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.worker.join()

    def request(self, method='GET', path='/snapshot', **headers):
        try:
            return urlopen(Request(self.url + path, method=method, headers=headers), timeout=2)
        except HTTPError as e:
            return e

    def test_requires_exact_origin_and_key_before_reading_frames(self):
        for headers, expected in [({}, 403), ({'Origin': 'https://evil.test'}, 403), ({'Origin': 'https://cowcoming.world'}, 401)]:
            with self.request(**headers) as r:
                self.assertEqual(r.status, expected)
        self.assertEqual(self.calls, [])
        with self.request(Origin='https://cowcoming.world', Authorization='Bearer ' + self.token) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.headers['Access-Control-Allow-Origin'], 'https://cowcoming.world')
            self.assertEqual(json.load(r)['frameId'], 3)

    def test_preflight_is_read_only_and_host_bound(self):
        with self.request('OPTIONS', Origin='https://cowcoming.world', **{'Access-Control-Request-Method':'GET', 'Access-Control-Request-Headers':'authorization'}) as r:
            self.assertEqual(r.status, 204)
            self.assertEqual(r.headers['Access-Control-Allow-Private-Network'], 'true')
        with self.request('OPTIONS', Origin='https://cowcoming.world', **{'Access-Control-Request-Method':'POST'}) as r:
            self.assertEqual(r.status, 403)
        with self.request(Origin='https://cowcoming.world', Host='rebinding.test') as r:
            self.assertEqual(r.status, 403)
        with self.request('POST', '/manual-action') as r:
            self.assertEqual(r.status, 405)
        with self.request(path='/stop-follow', Origin='https://cowcoming.world', Authorization='Bearer ' + self.token) as r:
            self.assertEqual(r.status, 404)
        self.assertEqual(self.calls, [])

    def test_key_file_is_private_and_reused(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / 'key'
            key = token_from_file(p)
            self.assertEqual(key, token_from_file(p))
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)

    def test_upstream_is_only_local_and_no_inline_secrets(self):
        self.assertEqual(loopback_url('http://127.0.0.1:8765/snapshot'), 'http://127.0.0.1:8765/snapshot')
        for url in ['http://192.168.1.1/snapshot', 'https://evil.test/', 'http://x:y@localhost/', 'http://localhost/?secret=x']:
            with self.assertRaises(ValueError): loopback_url(url)


if __name__ == '__main__': unittest.main()
