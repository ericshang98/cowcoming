import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyDeployment } from '../scripts/verify-deployment.mjs';

test('deployment verification rejects stale commits, dirty builds and mismatched live assets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cowcoming-deploy-test-'));
  const commit = 'a'.repeat(40);
  try {
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'assets/site.js'), 'current-js');
    await writeFile(join(directory, 'assets/site.css'), 'current-css');
    let info = { commit, dirty: false };
    let js = 'current-js';
    const request = async url => {
      const bodies = {
        '/build-info.json': JSON.stringify(info),
        '/': '<script src="/assets/site.js"></script><link href="/assets/site.css">',
        '/assets/site.js': js,
        '/assets/site.css': 'current-css',
      };
      return new Response(bodies[url.pathname] || 'missing', { status: bodies[url.pathname] ? 200 : 404 });
    };
    assert.equal((await verifyDeployment('https://example.test', commit, { directory, request })).commit, commit);
    info = { commit: 'b'.repeat(40), dirty: false };
    await assert.rejects(verifyDeployment('https://example.test', commit, { directory, request }), /expected clean commit/);
    info = { commit, dirty: true };
    await assert.rejects(verifyDeployment('https://example.test', commit, { directory, request }), /expected clean commit/);
    info = { commit, dirty: false };
    js = 'stale-js';
    await assert.rejects(verifyDeployment('https://example.test', commit, { directory, request }), /Asset mismatch/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
