import test from "node:test";
import assert from "node:assert/strict";
import {
  STARS,
  normalizeCollected,
  collectStar,
  readCollection,
  writeCollection,
  mamaUnlocked,
  canPlayTrack,
} from "../src/world-collection.mjs";

test("collection ignores duplicate, obsolete and malformed saved records", () => {
  assert.deepEqual(
    normalizeCollected(["star-01", "star-01", "week_1", null, 5, "star-28"]),
    ["star-01"],
  );
  for (const value of [null, {}, "star-01", 27])
    assert.deepEqual(normalizeCollected(value), []);
  assert.equal(
    mamaUnlocked([...STARS.slice(0, 26).map((s) => s.id), "unknown"]),
    false,
  );
});
test("pickup requires active proximity and counts each star once", () => {
  const star = STARS[0],
    position = { x: star.x, z: star.z };
  assert.deepEqual(collectStar([], star.id, position, false), []);
  assert.deepEqual(collectStar([], "unknown", position, true), []);
  assert.deepEqual(
    collectStar([], star.id, { x: star.x + 1.61, z: star.z }, true),
    [],
  );
  const collected = collectStar(
    [],
    star.id,
    { x: star.x + 1.6, z: star.z },
    true,
  );
  assert.deepEqual(collected, [star.id]);
  assert.strictEqual(
    collectStar(collected, star.id, position, true),
    collected,
  );
  assert.deepEqual(collectStar([], star.id, { x: NaN, z: star.z }, true), []);
});
test("only the last distinct star unlocks mama, other speech stays available", () => {
  const before = STARS.slice(0, 26).map((s) => s.id),
    last = STARS[26];
  assert.equal(mamaUnlocked(before), false);
  assert.equal(canPlayTrack("mama", before), false);
  assert.equal(canPlayTrack("okay", before), true);
  const all = collectStar(before, last.id, last, true);
  assert.equal(mamaUnlocked(all), true);
  assert.equal(canPlayTrack("mama", all), true);
  assert.strictEqual(collectStar(all, last.id, last, true), all);
});
test("storage errors preserve playable session and roundtrip valid progress", () => {
  const broken = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert.deepEqual(readCollection(broken), { ids: [], persistent: false });
  assert.equal(writeCollection(broken, ["star-01"]), false);
  let saved = "bad json";
  const storage = {
    getItem: () => saved,
    setItem: (_, value) => {
      saved = value;
    },
  };
  assert.deepEqual(readCollection(storage), { ids: [], persistent: true });
  assert.equal(
    writeCollection(storage, ["star-01", "star-01", "unknown"]),
    true,
  );
  assert.deepEqual(readCollection(storage), {
    ids: ["star-01"],
    persistent: true,
  });
});

test('home Mama works without collecting stars while WORLD keeps its unlock rule', () => {
  assert.equal(canPlayTrack('mama', [], 'home'), true);
  assert.equal(canPlayTrack('mama', [], 'blog'), false);
  assert.equal(canPlayTrack('mama', STARS.map(star => star.id), 'blog'), true);
});
