import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../scripts/write-build-info.mjs', import.meta.url));
test('archive builds keep source commit but cannot pass clean deployment checks', () => {
  const root = mkdtempSync(join(tmpdir(), 'cowcoming-archive-'));
  try {
    // A containing Git repo must never supply the archive version.
    execFileSync('git', ['init', '-q', root]);
    const cwd = join(root, 'source');
    mkdirSync(join(cwd, 'dist'), { recursive: true });
    writeFileSync(join(cwd, 'SOURCE_VERSION.json'), JSON.stringify({ commit: 'a'.repeat(40) }));
    execFileSync(process.execPath, [script], { cwd });
    const info = JSON.parse(readFileSync(join(cwd, 'dist/build-info.json')));
    assert.equal(info.commit, 'a'.repeat(40));
    assert.equal(info.dirty, null);
    assert.equal(info.archiveSource, true);
    writeFileSync(join(cwd, 'SOURCE_VERSION.json'), '{"commit":"invalid"}');
    assert.throws(() => execFileSync(process.execPath, [script], { cwd, stdio: 'pipe' }));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
