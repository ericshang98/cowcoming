import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const digest = value => createHash('sha256').update(value).digest('hex');

export async function verifyDeployment(origin, commit, { directory = 'dist', request = fetch } = {}) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Expected a full Git commit SHA.');
  const get = async path => {
    const url = new URL(path, origin);
    url.searchParams.set('verify', `${commit}-${Date.now()}`);
    const response = await request(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response;
  };
  const info = await (await get('/build-info.json')).json();
  if (info.commit !== commit || info.dirty !== false) throw new Error('The domain does not yet serve the expected clean commit.');
  const html = await (await get('/')).text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(match => match[1]);
  if (!assets.some(path => path.endsWith('.js')) || !assets.some(path => path.endsWith('.css'))) {
    throw new Error('Expected JavaScript and CSS entry assets were not found.');
  }
  for (const path of new Set(assets)) {
    const target = resolve(directory, '.' + path);
    if (!target.startsWith(resolve(directory) + '/')) throw new Error('Invalid asset path.');
    const local = await readFile(target);
    const remote = Buffer.from(await (await get(path)).arrayBuffer());
    if (digest(local) !== digest(remote)) throw new Error(`Asset mismatch: ${path}`);
  }
  return { commit, assets };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , origin, commit] = process.argv;
  let failure;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const result = await verifyDeployment(origin, commit);
      console.log(`Verified ${origin}: ${result.commit}, ${result.assets.length} matching entry assets.`);
      failure = null;
      break;
    } catch (error) {
      failure = error;
      console.error(`Verification ${attempt + 1}/10: ${error.message}`);
      if (attempt < 9) await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  if (failure) process.exitCode = 1;
}
