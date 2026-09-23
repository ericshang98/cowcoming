import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ipCatalog } from '../src/ip-catalog.mjs';

test('every selectable IP ships a self-contained GLB with the required real animation clips', () => {
  assert.equal(new Set(ipCatalog.map(ip => ip.id)).size, 5);
  for (const ip of ipCatalog.filter(ip => ip.available)) {
    const bytes = fs.readFileSync(new URL(`../public${ip.model}`, import.meta.url));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.ok(doc.skins?.length, ip.id);
    assert.ok(ip.clips.every(name => doc.animations.some(clip => clip.name === name)), ip.id);
    assert.ok([...doc.buffers, ...(doc.images || [])].every(resource => !resource.uri), ip.id);
    for (const track of Object.values(ip.actions || {})) {
      assert.ok(fs.statSync(new URL(`../public${track.src}`, import.meta.url)).size > 10000);
      assert.ok(doc.animations.some(clip => clip.name === track.clip));
    }
  }
});
test('new character model bytes match the user archive receipts', () => {
  const receipt = JSON.parse(fs.readFileSync(new URL('../public/characters/model-receipt.json', import.meta.url)));
  for (const model of receipt) {
    const bytes = fs.readFileSync(new URL(`../public/characters/${model.id}/v1/model.glb`, import.meta.url));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), model.sha256);
    assert.equal(bytes.length, model.bytes);
  }
});
