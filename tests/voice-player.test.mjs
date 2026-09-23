import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoicePlayer } from '../src/voice-player.mjs';

const track = id => ({ id, src: `/audio/${id}.mp3`, text: id });
function fixture(fetchAudio = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }), timeoutMs = 1000) {
  const states = [], levels = [], sources = [];
  const context = {
    state: 'running', destination: {}, resume: async () => {}, close: async () => {},
    decodeAudioData: async () => ({}),
    createBufferSource() {
      const s = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } };
      sources.push(s); return s;
    },
    createAnalyser: () => ({ connect() {}, disconnect() {}, getFloatTimeDomainData: a => a.fill(.12) }),
  };
  const player = createVoicePlayer({ onState: s => states.push(s), onLevel: (level, active) => levels.push({level,active}),
    createContext: () => context, fetchAudio, requestFrame: () => 1, cancelFrame() {}, timeoutMs });
  return {player, states, levels, sources};
}
test('new clips stop the previous sound; stale ended callbacks cannot stop the new clip', async () => {
  const {player, states, levels, sources} = fixture();
  await player.play(track('a')); const oldEnd = sources[0].onended;
  await player.play(track('b'));
  assert.equal(sources[0].stopped, true);
  oldEnd();
  assert.equal(states.at(-1).track.id, 'b');
  assert.equal(states.at(-1).status, 'playing');
  assert.ok(levels.at(-1).level > 0);
  sources[1].onended();
  assert.equal(states.at(-1).status, 'ended');
  assert.deepEqual(levels.at(-1), {level:0,active:false});
  player.dispose();
});
test('stop during loading prevents late audio and subtitles after navigation or mute', async () => {
  let resolve;
  let gestures=0;
  const {player,states,sources} = fixture(() => new Promise(r => { resolve=r; }));
  const pending=player.play(track('slow'),{onStart:()=>gestures++});
  player.stop();
  resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
  await pending;
  assert.equal(sources.length,0);
  assert.equal(gestures,0);
  assert.equal(states.at(-1).status,'idle');
  player.dispose();
});
test('failed clip is retryable, without a stuck mouth or playback state', async () => {
  let calls=0;
  let gestures=0;
  const {player,states,levels}=fixture(async()=>({ok:++calls>1,arrayBuffer:async()=>new ArrayBuffer(8)}));
  await player.play(track('retry'),{onStart:()=>gestures++});
  assert.equal(states.at(-1).status,'error');
  assert.equal(gestures,0);
  assert.equal(levels.at(-1).active,false);
  await player.play(track('retry'),{onStart:()=>gestures++});
  assert.equal(states.at(-1).status,'playing');
  assert.equal(gestures,1);
  player.dispose();
});
test('stalled loading expires with a recoverable error', async () => {
  const {player,states,levels}=fixture(()=>new Promise(()=>{}),15);
  await player.play(track('timeout'));
  assert.equal(states.at(-1).status,'error');
  assert.deepEqual(levels.at(-1),{level:0,active:false});
  player.dispose();
});

test('Mama loops on one source, stops cleanly and does not make later clips loop', async () => {
  const {player, states, levels, sources} = fixture();
  await player.play(track('mama'), {loop:true});
  assert.equal(sources[0].loop, true);
  assert.equal(states.at(-1).loop, true);
  assert.equal(sources.length, 1);
  player.stop();
  assert.equal(sources[0].stopped, true);
  assert.equal(sources[0].onended, null);
  assert.deepEqual(levels.at(-1), {level:0,active:false});
  await player.play(track('a'));
  assert.equal(sources[1].loop, false);
  assert.equal(states.at(-1).loop, false);
  player.dispose();
  assert.equal(sources[1].stopped, true);
});
