import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';

const sourceUrl = 'https://uxl9fceo481.feishu.cn/wiki/Ehc9w5bs1ic2gEkwZjCc8Eo1nmb';
const documentId = 'HiO3dJtGPomHq3xuNfKcDovanLb';
const identity = process.env.LARK_IDENTITY || 'bot';
const destination = new URL('../docs/product/', import.meta.url);

try {
  if (!['bot', 'user'].includes(identity)) throw new Error('LARK_IDENTITY must be bot or user.');
  const result = spawnSync('lark-cli', [
    'docs', '+fetch', '--as', identity, '--doc', sourceUrl, '--doc-format', 'markdown',
  ], { encoding: 'utf8', timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error('Cannot fetch document. Check lark-cli installation and this device’s document access.');
  }
  let response;
  try { response = JSON.parse(result.stdout); }
  catch { throw new Error('lark-cli did not return valid JSON.'); }
  const document = response.data?.document;
  if (response.ok !== true || document?.document_id !== documentId ||
      typeof document.content !== 'string' || document.content.trim().length < 100 ||
      document.revision_id == null) {
    throw new Error('Document response is missing the expected ID, content or revision.');
  }
  const metadata = {
    source_url: sourceUrl,
    document_id: document.document_id,
    revision_id: document.revision_id,
    fetched_at: new Date().toISOString(),
    content_sha256: createHash('sha256').update(document.content).digest('hex'),
    format: 'markdown',
  };
  mkdirSync(destination, { recursive: true });
  writeFileSync(new URL('spec.md.tmp', destination), document.content);
  writeFileSync(new URL('source.json.tmp', destination), JSON.stringify(metadata, null, 2) + '\n');
  renameSync(new URL('spec.md.tmp', destination), new URL('spec.md', destination));
  renameSync(new URL('source.json.tmp', destination), new URL('source.json', destination));
  console.log(`Updated product snapshot: revision ${metadata.revision_id}. Review the diff before committing.`);
} catch (error) {
  console.error(`Product sync failed: ${error.message}`);
  process.exitCode = 1;
}
