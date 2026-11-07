import test from 'node:test';
import assert from 'node:assert/strict';
import { browserLabel, decodeBrowserCard, encodeBrowserCard, MAX_CARD_BYTES } from '../dist/browser-card.js';

function measurement() {
  const view = {
    layout: [400.5, 36], ink: [120, 153], fontStack: '"Noto Lab", sans-serif',
    fontState: 'bundled-loaded', missingLocal: false,
  };
  return {
    capturedAt: '2026-11-07T19:00:00.000Z',
    environment: { browser: 'Firefox 159.0', viewportWidth: 1348, pixelRatio: 1 },
    graphemes: 1,
    snapshot: {
      text: 'a\u0301', preset: null, fontSize: 28, lineHeight: 36,
      views: {
        a: { font: 'noto', localFont: 'a'.repeat(64), overflow: 'visible', panelOverflow: 'hidden' },
        b: { font: 'noto', overflow: 'clip', panelOverflow: 'hidden' },
      },
      showBoxes: true, showInk: false, markCount: 12, markType: 'homothetic',
      speed: 500, inspector: 'graphemes', selected: 0, showEscapes: false,
    },
    views: { a: { ...view, missingLocal: true }, b: { ...view, ink: null } },
  };
}

test('a browser card round-trips Unicode, settings, nullable ink and known font substitutions', () => {
  const original = measurement();
  const raw = encodeBrowserCard(original);
  assert.deepEqual(decodeBrowserCard('\uFEFF' + raw), { ...original, format: 'happy-emotes-browser-card', version: 1 });
});

test('browser cards reject wrong formats, invalid settings and unreasonable or missing measurements', () => {
  const card = JSON.parse(encodeBrowserCard(measurement()));
  for (const mutate of [
    c => { c.version = 2; },
    c => { c.format = 'happy-emotes-notebook'; },
    c => { c.snapshot.views.b.font = 'url(https://example.com/font)'; },
    c => { c.views.a.layout = [100, -1]; },
    c => { delete c.views.b.ink; },
    c => { c.graphemes = 3; },
    c => { c.environment.pixelRatio = 0; },
  ]) {
    const changed = structuredClone(card);
    mutate(changed);
    assert.throws(() => decodeBrowserCard(JSON.stringify(changed)));
  }
  assert.throws(() => decodeBrowserCard(' '.repeat(MAX_CARD_BYTES + 1)), /64 KiB/);
});

test('browser labels distinguish Chromium derivatives and expose no raw user agent', () => {
  assert.equal(browserLabel('Mozilla/5.0 Chrome/150.0 Safari/537.36 Edg/150.2'), 'Edge 150.2');
  assert.equal(browserLabel('Mozilla/5.0 Gecko/20100101 Firefox/159.0'), 'Firefox 159.0');
  assert.equal(browserLabel('Mozilla/5.0 Version/26.0 Safari/605.1'), 'Safari 26.0');
  assert.equal(browserLabel('Unknown platform / string'), 'Navegador sin identificar');
});
