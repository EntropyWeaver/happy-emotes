import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSpider } from '../dist/core.js';
import { createNotebookStore, decodeNotebook, encodeNotebook, experimentName, mergeExperiments, validateSnapshot, NOTEBOOK_KEY, MAX_EXPERIMENTS } from '../dist/notebook.js';

function entry(id = 'test-1', name = 'La araña que trepa tres mensajes') {
  return { id, name, createdAt: '2026-11-06T20:00:00.000Z', snapshot: {
    text: makeSpider(12), preset: 'spider', fontSize: 28, lineHeight: 36,
    views: { a: { font: 'noto', overflow: 'visible' }, b: { font: 'serif', overflow: 'hidden' } },
    showBoxes: true, showInk: true, markCount: 12, markType: 'homothetic',
    speed: 1000, inspector: 'codepoints', selected: 4, showEscapes: true,
  } };
}
function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('JSON round-trip preserves exact Unicode and all settings in both views', () => {
  const spider = entry();
  const custom = entry('test-2', 'Familia y acentos');
  custom.snapshot.text = '👨‍👩‍👧‍👦\na\u0301\tبِ\u200D';
  custom.snapshot.preset = null;
  assert.deepEqual(decodeNotebook(encodeNotebook([spider, custom])), [spider, custom]);
  assert.deepEqual(decodeNotebook('\uFEFF' + encodeNotebook([custom])), [custom]);
});

test('imports reject invalid formats, overlong text, unsafe settings and inconsistent generators', () => {
  for (const raw of ['{', '{}', '[]', '{"format":"happy-emotes-notebook","version":2,"experiments":[]}']) assert.throws(() => decodeNotebook(raw));
  for (const mutate of [
    s => { s.fontSize = '28'; },
    s => { s.lineHeight = 100; },
    s => { s.views.a.font = 'url(https://example.com)'; },
    s => { s.views.b.overflow = 'auto'; },
    s => { s.showBoxes = 'false'; },
    s => { s.markCount = 61; },
    s => { s.text = '😀'.repeat(513); s.preset = null; },
    s => { s.text = makeSpider(5); },
    s => { s.selected = -1; },
  ]) {
    const sample = entry();
    mutate(sample.snapshot);
    assert.throws(() => validateSnapshot(sample.snapshot));
  }
  const duplicateIds = JSON.stringify({ format: 'happy-emotes-notebook', version: 1, experiments: [entry(), entry()] });
  assert.throws(() => decodeNotebook(duplicateIds), /identificadores/);
});

test('merge skips exact repeats and retains both versions when an imported ID has changed', () => {
  const original = entry();
  const changed = entry('test-1', 'Arial le corta las alas');
  changed.snapshot.views.a.font = 'sans';
  const result = mergeExperiments([original], [original, changed], () => 'fresh-id');
  assert.deepEqual([result.added, result.skipped], [1, 1]);
  assert.deepEqual(result.entries[0], original);
  assert.equal(result.entries[1].id, 'fresh-id');
  assert.equal(changed.id, 'test-1');
});

test('capacity and byte limits reject the whole import without truncating the notebook', () => {
  const full = Array.from({ length: MAX_EXPERIMENTS }, (_, i) => entry(`test-${i}`, `Experimento ${i}`));
  assert.throws(() => mergeExperiments(full, [entry('new', 'Nuevo')], () => 'new-id'), /espacio/);
  assert.equal(full.length, MAX_EXPERIMENTS);
  assert.throws(() => decodeNotebook(' '.repeat(1024 * 1024 + 1)), /1 MiB/);
});

test('persistent writes read the current notebook, including another tab’s additions', () => {
  const storage = memoryStorage();
  const a = createNotebookStore(() => storage);
  const b = createNotebookStore(() => storage);
  a.change(current => [...current, entry('one')]);
  b.change(current => [...current, entry('two')]);
  assert.equal(a.read().length, 2);
  assert.equal(createNotebookStore(() => storage).read().length, 2);
  assert.equal(a.temporary, false);
});

test('corrupt storage and quota errors leave the existing saved data intact', () => {
  const storage = memoryStorage();
  storage.setItem(NOTEBOOK_KEY, '{broken');
  const store = createNotebookStore(() => storage);
  assert.throws(() => store.change(() => [entry()]), /JSON/);
  assert.equal(storage.getItem(NOTEBOOK_KEY), '{broken');
  const original = encodeNotebook([entry()]);
  storage.setItem(NOTEBOOK_KEY, original);
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => store.change(() => []), /No se ha podido guardar/);
  assert.equal(storage.getItem(NOTEBOOK_KEY), original);
});

test('blocked storage explicitly uses temporary memory; text is never normalized or interpreted', () => {
  const store = createNotebookStore(() => { throw new Error('SecurityError'); });
  assert.equal(store.temporary, true);
  const sample = entry();
  sample.name = '<img src=x onerror=alert(1)>';
  sample.snapshot.preset = null;
  sample.snapshot.text = '<script>alert(1)</script>a\u0301';
  store.change(() => [sample]);
  assert.deepEqual(store.read(), [sample]);
  assert.equal(experimentName('  Mi   descubrimiento  '), 'Mi descubrimiento');
  assert.throws(() => experimentName('   '));
});
