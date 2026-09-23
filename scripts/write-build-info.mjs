import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// A handoff archive has no .git. Never accidentally read a parent repository.
const archiveSource = !existsSync('.git');
const commit = archiveSource
  ? JSON.parse(readFileSync('SOURCE_VERSION.json', 'utf8')).commit
  : execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid source commit.');
// Archive edits cannot be checked by Git; null deliberately fails clean-deploy verification.
const dirty = archiveSource ? null : Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim());
writeFileSync('dist/build-info.json', JSON.stringify({ commit, dirty, archiveSource, builtAt: new Date().toISOString() }, null, 2) + '\n');
console.log(`Build version: ${commit}${archiveSource ? ' (source archive; changes unverified)' : dirty ? ' (uncommitted changes)' : ''}`);
