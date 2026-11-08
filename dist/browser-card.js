import { t } from './i18n.js';
import { validateSnapshot } from './notebook.js';

export const MAX_CARD_BYTES = 64 * 1024;
const FORMAT = 'happy-emotes-browser-card';
const validNumber = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const validText = (value, limit) => typeof value === 'string' && value.length > 0 && value.length <= limit;
const validPair = value => Array.isArray(value) && value.length === 2 && value.every(item => validNumber(item, 0, 1000000));
const fontStates = ['bundled-loaded', 'bundled-unavailable', 'local-loaded', 'system'];

export function browserLabel(userAgent) {
  for (const [name, pattern] of [
    ['Edge', /\b(?:Edg|EdgA|EdgiOS)\/([\d.]+)/u],
    ['Opera', /\b(?:OPR|OPiOS)\/([\d.]+)/u],
    ['Firefox', /\b(?:Firefox|FxiOS)\/([\d.]+)/u],
    ['Chrome', /\b(?:Chrome|CriOS)\/([\d.]+)/u],
    ['Safari', /\bVersion\/([\d.]+).*\bSafari\//u],
  ]) {
    const match = userAgent.match(pattern);
    if (match) return `${name} ${match[1]}`;
  }
  return t("Unidentified browser", "Navegador sin identificar");
}

function validateCard(card) {
  if (!card || card.format !== FORMAT || card.version !== 1) throw new Error(t("Expected a Happy Emotes browser record, version 1.", "Se esperaba una ficha de navegador de Happy Emotes, versión 1."));
  const snapshot = validateSnapshot(card.snapshot);
  const { capturedAt, environment, graphemes, views } = card;
  if (!validText(capturedAt, 40) || !Number.isFinite(Date.parse(capturedAt)) ||
      !validText(environment?.browser, 80) || !validNumber(environment.viewportWidth, 1, 100000) ||
      !validNumber(environment.pixelRatio, 0.01, 100)) {
    throw new Error(t("The browser record environment is invalid.", "El entorno de la ficha no es válido."));
  }
  if (graphemes !== null && (!Number.isInteger(graphemes) || !validNumber(graphemes, 0, Array.from(snapshot.text).length))) {
    throw new Error(t("The grapheme count is invalid.", "El recuento de grafemas no es válido."));
  }
  const measuredViews = {};
  for (const id of ['a', 'b']) {
    const view = views?.[id];
    if (!validPair(view?.layout) || (view.ink !== null && !validPair(view.ink)) ||
        !validText(view.fontStack, 160) || !fontStates.includes(view.fontState) || typeof view.missingLocal !== 'boolean') {
      throw new Error(t(`The measurements for view ${id.toUpperCase()} are invalid.`, `Las medidas de la vista ${id.toUpperCase()} no son válidas.`));
    }
    const { layout, ink, fontStack, fontState, missingLocal } = view;
    measuredViews[id] = { layout, ink, fontStack, fontState, missingLocal };
  }
  const { browser, viewportWidth, pixelRatio } = environment;
  return { format: FORMAT, version: 1, capturedAt, environment: { browser, viewportWidth, pixelRatio }, snapshot, graphemes, views: measuredViews };
}

export function encodeBrowserCard(measurement) {
  return JSON.stringify(validateCard({ ...measurement, format: FORMAT, version: 1 }), null, 2);
}

export function decodeBrowserCard(raw) {
  if (new TextEncoder().encode(raw).length > MAX_CARD_BYTES) throw new Error(t("The record can be up to 64 KiB.", "La ficha admite hasta 64 KiB."));
  let card;
  try { card = JSON.parse(raw.replace(/^\uFEFF/u, '')); }
  catch { throw new Error(t("The file does not contain valid JSON.", "El archivo no contiene un JSON válido.")); }
  return validateCard(card);
}
