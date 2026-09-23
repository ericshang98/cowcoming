import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim());
writeFileSync('dist/build-info.json', JSON.stringify({ commit, dirty, builtAt: new Date().toISOString() }, null, 2) + '\n');
console.log(`Build version: ${commit}${dirty ? ' (uncommitted changes)' : ''}`);
