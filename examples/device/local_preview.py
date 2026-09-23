"""Read-only loopback snapshot bridge. No camera, motor or cloud connections.

Use create_server(provider, token=..., origins=...) to embed in another program.
The CLI reads an existing localhost JSON snapshot, without opening its camera.
"""
import argparse
import hmac
import json
import os
from pathlib import Path
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from urllib.request import build_opener, ProxyHandler, HTTPRedirectHandler, Request

LIMIT = 8_100_000


def loopback_url(value):
    parsed = urlsplit(value)
    if (parsed.scheme not in ('http', 'https') or parsed.hostname not in ('localhost', '127.0.0.1', '::1')
            or parsed.username or parsed.password or parsed.query or parsed.fragment):
        raise ValueError('Upstream must be a loopback URL without credentials or query parameters')
    return value


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        raise ValueError('Snapshot redirects are not allowed')


def upstream_provider(url):
    url = loopback_url(url)
    opener = build_opener(ProxyHandler({}), NoRedirect())

    def read():
        with opener.open(Request(url, headers={'Accept': 'application/json'}), timeout=2) as response:
            if response.headers.get_content_type() != 'application/json':
                raise ValueError('Snapshot must be JSON')
            body = response.read(LIMIT + 1)
        if len(body) > LIMIT:
            raise ValueError('Snapshot is too large')
        value = json.loads(body)
        if not isinstance(value, dict):
            raise ValueError('Snapshot must be an object')
        return value
    return read


def valid_origin(value):
    p = urlsplit(value)
    return (p.scheme == 'https' or p.scheme == 'http' and p.hostname in ('localhost', '127.0.0.1', '::1')) and bool(p.netloc) and not (p.path or p.query or p.fragment or p.username or p.password)


def create_server(provider, *, token, origins, port=8767):
    if len(token) < 24 or not token.isascii() or not token.isalnum():
        raise ValueError('Use at least 24 ASCII letters/digits for the local token')
    origins = frozenset(origins)
    if not origins or not all(valid_origin(o) for o in origins):
        raise ValueError('Configure exact HTTPS or loopback origins (no trailing slash)')

    class Handler(BaseHTTPRequestHandler):
        def allowed(self):
            port = self.server.server_port
            return self.headers.get('Host') in (f'127.0.0.1:{port}', f'localhost:{port}') and self.headers.get('Origin') in origins

        def reply(self, status, payload, cors=False):
            body = json.dumps(payload, separators=(',', ':'), allow_nan=False).encode()
            self.send_response(status)
            if cors:
                self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
                self.send_header('Vary', 'Origin')
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            requested = {s.strip().lower() for s in self.headers.get('Access-Control-Request-Headers', '').split(',') if s.strip()}
            if not self.allowed() or self.path != '/snapshot' or self.headers.get('Access-Control-Request-Method') != 'GET' or not requested <= {'authorization'}:
                self.reply(403, {'error': 'Origin or method not allowed'})
                return
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Methods', 'GET')
            self.send_header('Access-Control-Allow-Headers', 'Authorization')
            self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.send_header('Access-Control-Max-Age', '300')
            self.send_header('Content-Length', '0')
            self.end_headers()

        def do_GET(self):
            if not self.allowed():
                self.reply(403, {'error': 'Origin not allowed'})
                return
            supplied = self.headers.get('Authorization', '').encode()
            if not hmac.compare_digest(supplied, ('Bearer ' + token).encode()):
                self.reply(401, {'error': 'Local preview key required'}, True)
                return
            if self.path != '/snapshot':
                self.reply(404, {'error': 'Only /snapshot is available'}, True)
                return
            try:
                value = provider()
                if not isinstance(value, dict) or len(json.dumps(value, allow_nan=False)) > LIMIT:
                    raise ValueError('Invalid snapshot')
                self.reply(200, value, True)
            except (BrokenPipeError, ConnectionResetError):
                return
            except Exception:
                # No upstream response, credentials or image contents in logs/errors.
                self.reply(502, {'error': 'Local snapshot unavailable'}, True)

        def do_POST(self):
            self.reply(405, {'error': 'Read-only preview'})

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    return server


def token_from_file(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        return path.read_text().strip()
    with os.fdopen(fd, 'w') as stream:
        token = secrets.token_hex(24)
        stream.write(token + '\n')
    return token


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--upstream', default='http://127.0.0.1:8765/snapshot')
    p.add_argument('--port', type=int, default=8767)
    p.add_argument('--origin', action='append', default=None, help='Exact allowed webpage origin; repeat as needed')
    p.add_argument('--token-file', default='.pwc/local-preview.key')
    args = p.parse_args()
    server = create_server(upstream_provider(args.upstream), token=token_from_file(args.token_file),
                           origins=args.origin or ['https://cowcoming.world', 'https://www.cowcoming.world', 'http://127.0.0.1:4178'], port=args.port)
    print(f'Read-only local video: http://127.0.0.1:{server.server_port}/snapshot', flush=True)
    print(f'Local preview key file: {Path(args.token_file).resolve()} (enter in camera settings; do not commit)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
