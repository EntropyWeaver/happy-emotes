import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayback } from '../dist/playback.js';
import { analyzeText, makeSpider, MAX_MARKS } from '../dist/core.js';

function fixture(initial = 0) {
  let count = initial;
  let delay = 500;
  let now = 0;
  let id = 0;
  const jobs = new Map();
  const history = [];
  const player = createPlayback({
    getCount: () => count,
    setCount: value => { count = value; history.push(value); },
    getDelay: () => delay,
    maximum: MAX_MARKS,
    onChange: () => {},
    schedule: (fn, ms) => { jobs.set(++id, { fn, at: now + ms }); return id; },
    cancel: key => jobs.delete(key),
  });
  return {
    player, history, jobs,
    get count() { return count; },
    speed(ms) { delay = ms; player.changeSpeed(); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at;
        jobs.delete(next[0]);
        next[1].fn();
      }
      now = end;
    },
  };
}

test('play advances exactly one incorporation per beat; pause and resume preserve the specimen', () => {
  const f = fixture(12);
  f.player.play();
  f.player.play();
  f.advance(499);
  assert.equal(f.count, 12);
  f.advance(1);
  assert.equal(f.count, 13);
  f.player.pause();
  f.advance(5000);
  assert.equal(f.count, 13);
  f.player.play();
  f.advance(500);
  assert.deepEqual(f.history, [13, 14]);
  assert.equal(f.jobs.size, 1);
});

test('a manual step pauses playback, and rewind cancels pending growth', () => {
  const f = fixture(10);
  f.player.play();
  f.advance(200);
  f.player.step();
  assert.equal(f.count, 11);
  assert.equal(f.player.playing, false);
  f.advance(1000);
  assert.equal(f.count, 11);
  f.player.play();
  f.player.rewind();
  f.advance(1000);
  assert.equal(f.count, 0);
  assert.equal(f.jobs.size, 0);
});

test('completion stops at 60; stepping cannot overshoot and replay starts at zero', () => {
  const f = fixture(59);
  f.player.play();
  f.advance(10000);
  assert.equal(f.count, 60);
  assert.equal(f.player.playing, false);
  assert.equal(f.jobs.size, 0);
  f.player.step();
  assert.equal(f.count, 60);
  f.player.play();
  assert.equal(f.count, 0);
  f.advance(500);
  assert.equal(f.count, 1);
});

test('speed changes and canceled callbacks never leave duplicate timers', () => {
  const f = fixture();
  f.player.play();
  const staleTick = [...f.jobs.values()][0].fn;
  f.advance(100);
  f.speed(250);
  staleTick(); // A callback already queued when the user changed the speed.
  assert.equal(f.count, 0);
  f.advance(249);
  assert.equal(f.count, 0);
  f.advance(1);
  assert.equal(f.count, 1);
  assert.equal(f.jobs.size, 1);
  f.player.pause();
  f.speed(1000);
  f.advance(3000);
  assert.equal(f.count, 1);
  assert.equal(f.jobs.size, 0);
});

test('a complete animation adds one codepoint each time and preserves the combining cluster', () => {
  const f = fixture();
  f.player.play();
  f.advance(60 * 500);
  assert.equal(f.history.length, 60);
  const base = analyzeText(makeSpider(0));
  for (const [i, count] of f.history.entries()) {
    const a = analyzeText(makeSpider(count));
    assert.equal(a.codepoints, base.codepoints + i + 1);
    assert.equal(a.clusters.length, base.clusters.length);
    assert.equal(a.clusters[4].text, 'o' + '\u034B'.repeat(count));
  }
});
