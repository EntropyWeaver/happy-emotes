import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, makeSpider, MAX_CODEPOINTS } from '../dist/core.js';
import { SHARE_PREFIX, MAX_SHARE_TOKEN_LENGTH, encodeExperiment, decodeExperimentHash, createExperimentURL } from '../dist/share.js';

function snapshot() {
  return {
    text: makeSpider(12), preset: 'spider', fontSize: 48, lineHeight: 16,
    views: { a: { font: 'noto', overflow: 'visible' }, b: { font: 'serif', overflow: 'hidden' } },
    showBoxes: false, showInk: true, markCount: 12, markType: 'homothetic',
    speed: 1000, inspector: 'codepoints', selected: 5, showEscapes: true,
  };
}
function uncheckedHash(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return SHARE_PREFIX + 'v1.' + btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

test('shared links preserve both views, all experiment controls and exact Unicode', () => {
  assert.deepEqual(decodeExperimentHash(SHARE_PREFIX + encodeExperiment(snapshot())), snapshot());
  for (const text of [...Object.values(PRESETS).map(p => p.text), 'a\u0301\n👨‍👩‍👧‍👦\tمَرْحَبًا\u200D\uFE0F', '<script>test</script> & # ? + %', '\uD800\uDC00\uD800']) {
    const original = { ...snapshot(), text, preset: null };
    const encoded = encodeExperiment(original);
    assert.match(encoded, /^v1\.[A-Za-z0-9_-]+$/u);
    assert.deepEqual(decodeExperimentHash(SHARE_PREFIX + encoded), original);
  }
});

test('URLs support subdirectories, replace old fragments and omit existing query parameters', () => {
  for (const base of ['https://example.com/', 'http://localhost:8000/lab/index.html?old=parameter#cuaderno']) {
    const result = new URL(createExperimentURL(base, snapshot()));
    const original = new URL(base);
    assert.equal(result.origin, original.origin);
    assert.equal(result.pathname, original.pathname);
    assert.equal(result.search, '');
    assert.deepEqual(decodeExperimentHash(result.hash), snapshot());
  }
  assert.throws(() => createExperimentURL('javascript:alert(1)', snapshot()), /HTTP/);
});

test('ordinary anchors are ignored; truncated, oversized, invalid UTF-8 and future-version payloads are rejected', () => {
  for (const hash of ['', '#cuaderno', '#anatomia', '#share-experiment']) assert.equal(decodeExperimentHash(hash), null);
  for (const hash of ['#experiment', SHARE_PREFIX, SHARE_PREFIX + 'v1.A', SHARE_PREFIX + 'v1._w', SHARE_PREFIX + 'v1.not-json', SHARE_PREFIX + 'v1.%%%%', SHARE_PREFIX + 'v1.' + 'a'.repeat(MAX_SHARE_TOKEN_LENGTH)]) assert.throws(() => decodeExperimentHash(hash));
  assert.throws(() => decodeExperimentHash(SHARE_PREFIX + encodeExperiment(snapshot()).replace(/^v1/u, 'v2')), /versión/);
  assert.throws(() => decodeExperimentHash(uncheckedHash({ v: 2, experiment: snapshot() })));
});

test('untrusted links are fully validated before any settings can be restored', () => {
  for (const patch of [{ fontSize: 999 }, { showInk: 'true' }, { text: 'changed without changing preset' }, { selected: -1 }, { views: { a: { font: 'url(https://bad.example)', overflow: 'visible' }, b: snapshot().views.b } }]) {
    assert.throws(() => decodeExperimentHash(uncheckedHash({ v: 1, experiment: { ...snapshot(), ...patch } })));
  }
  assert.throws(() => encodeExperiment({ ...snapshot(), text: '😀'.repeat(MAX_CODEPOINTS + 1), preset: null }));
});

test('maximum-size Unicode and control strings fit the bounded link format', () => {
  for (const text of ['😀'.repeat(MAX_CODEPOINTS), '\u0000'.repeat(MAX_CODEPOINTS), '\uD800'.repeat(MAX_CODEPOINTS)]) {
    const original = { ...snapshot(), text, preset: null };
    const encoded = encodeExperiment(original);
    assert.ok(encoded.length <= MAX_SHARE_TOKEN_LENGTH);
    assert.equal(decodeExperimentHash(SHARE_PREFIX + encoded).text, text);
  }
});
