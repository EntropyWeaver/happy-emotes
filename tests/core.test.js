import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, MAX_CODEPOINTS, analyzeText, makeSpider, limitText, codepointLabel, escapedText, categoryOf, displayChar, canvasEligible } from '../dist/core.js';
import { readFileSync } from 'node:fs';

test('composed and decomposed accents look alike but have different codepoint counts', () => {
  const composed = analyzeText('á');
  const decomposed = analyzeText('a\u0301');
  assert.deepEqual([composed.codepoints, composed.clusters.length, composed.utf16, composed.utf8], [1, 1, 1, 2]);
  assert.deepEqual([decomposed.codepoints, decomposed.clusters.length, decomposed.utf16, decomposed.utf8], [2, 1, 2, 3]);
  assert.equal(decomposed.text.normalize('NFC'), composed.text);
});
test('family is seven points, eleven UTF-16 units, 25 UTF-8 bytes and one grapheme', () => {
  const a = analyzeText(PRESETS.family.text);
  assert.deepEqual([a.codepoints, a.clusters.length, a.utf16, a.utf8], [7, 1, 11, 25]);
  assert.deepEqual(a.points.map(p => p.offset), [0, 2, 3, 5, 6, 8, 9]);
  assert.ok(a.points.every(p => p.cluster === 0));
});
test('two regional indicators and an emoji modifier form the expected clusters', () => {
  assert.equal(analyzeText('🇪🇸').clusters.length, 1);
  assert.equal(analyzeText('👋🏽').clusters.length, 1);
  assert.equal(analyzeText(PRESETS.flags.text).clusters.length, 3);
});
test('spider thread changes points and marks, not the number of graphemes', () => {
  const short = analyzeText(makeSpider(1));
  const long = analyzeText(makeSpider(60));
  assert.equal(short.clusters.length, long.clusters.length);
  assert.equal(long.marks - short.marks, 59);
  assert.equal(long.codepoints - short.codepoints, 59);
  assert.equal(long.text.normalize('NFC'), long.text);
});
test('Arabic presentation ligature is a letter, not a combining mark', () => {
  assert.equal(categoryOf('\uFC5E').code, 'L');
  assert.equal(analyzeText(makeSpider(4, '\uFC5E')).marks, 0);
  assert.equal(categoryOf('\u034B').code, 'Mn');
});
test('bounds preserve surrogate pairs and clamp generator settings', () => {
  const limited = limitText('😀'.repeat(600));
  assert.equal(Array.from(limited.text).length, MAX_CODEPOINTS);
  assert.equal(limited.text.length, MAX_CODEPOINTS * 2);
  assert.equal(limited.truncated, true);
  assert.equal(limitText('abc').truncated, false);
  assert.equal(analyzeText(makeSpider(-10)).marks, 0);
  assert.equal(analyzeText(makeSpider(999)).marks, 60);
  assert.equal(analyzeText(makeSpider(2, '<')).marks, 2);
});
test('missing Segmenter is explicit; it never fabricates a grapheme count', () => {
  const a = analyzeText('👨‍👩‍👧‍👦', null);
  assert.equal(a.clusters, null);
  assert.equal(a.codepoints, 7);
  assert.equal(a.points[0].cluster, null);
});
test('empty text and combining-only strings do not require a base glyph', () => {
  const a = analyzeText('');
  assert.deepEqual([a.codepoints, a.clusters.length, a.utf16, a.utf8], [0, 0, 0, 0]);
  assert.equal(analyzeText('\u034B'.repeat(30)).clusters.length, 1);
  assert.equal(displayChar('\u034B'), '◌\u034B');
});
test('escaped strings and labels handle astral characters and control codepoints', () => {
  assert.equal(codepointLabel('👋'), 'U+1F44B');
  assert.equal(escapedText('a\u0301👋'), '\\u0061\\u0301\\u{1F44B}');
  assert.equal(displayChar('\u200D'), 'ZWJ');
  assert.equal(displayChar('\n'), '↵');
});
test('multiline, tabs and bidi controls are excluded from Canvas guide', () => {
  for (const text of ['', 'a\nb', 'a\rb', 'a\tb', 'a\u202Eb']) assert.equal(canvasEligible(text), false);
  assert.equal(canvasEligible(PRESETS.family.text), true);
  assert.equal(canvasEligible(makeSpider()), true);
});
test('bundled catalogue tells the truth about its coverage and combining classes', () => {
  const catalog = JSON.parse(readFileSync(new URL('../dist/unicode-names.json', import.meta.url)));
  assert.equal(catalog.partial, true);
  assert.match(catalog.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(catalog.characters['34B'], ['COMBINING HOMOTHETIC ABOVE', 'Mn', 230]);
  assert.equal(catalog.characters['FC5E'][1], 'Lo');
});
