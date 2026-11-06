import { MAX_CODEPOINTS, MAX_MARKS, PRESETS, makeSpider } from './core.js';

export const NOTEBOOK_KEY = 'happy-emotes:notebook:v1';
export const MAX_EXPERIMENTS = 100;
export const MAX_IMPORT_BYTES = 1024 * 1024;
const FORMAT = 'happy-emotes-notebook';
const MARKS = { homothetic: '\u034B', acute: '\u0301', below: '\u0323', arabic: '\uFC5E' };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function requireValue(valid, message) { if (!valid) throw new Error(message); }
function choice(value, allowed, label) {
  requireValue(allowed.includes(value), `${label}: valor no válido.`);
  return value;
}
function integer(value, min, max, label) {
  requireValue(Number.isInteger(value) && value >= min && value <= max, `${label}: debe estar entre ${min} y ${max}.`);
  return value;
}
function boolean(value, label) {
  requireValue(typeof value === 'boolean', `${label}: se esperaba true o false.`);
  return value;
}
export function experimentName(value) {
  requireValue(typeof value === 'string', 'El experimento necesita un nombre.');
  const name = value.replace(/\s+/gu, ' ').trim();
  requireValue(name.length > 0 && name.length <= 80, 'El nombre debe tener entre 1 y 80 caracteres.');
  return name;
}

export function validateSnapshot(value) {
  requireValue(record(value), 'Faltan los ajustes del experimento.');
  requireValue(typeof value.text === 'string' && Array.from(value.text).length <= MAX_CODEPOINTS, `El texto admite hasta ${MAX_CODEPOINTS} puntos de código.`);
  requireValue(record(value.views), 'Faltan los ajustes de las vistas A/B.');
  const views = {};
  for (const id of ['a', 'b']) {
    requireValue(record(value.views[id]), `Falta la vista ${id.toUpperCase()}.`);
    views[id] = {
      font: choice(value.views[id].font, ['noto', 'sans', 'serif', 'mono', 'system'], 'Fuente'),
      overflow: choice(value.views[id].overflow, ['visible', 'clip', 'hidden'], 'Overflow'),
    };
  }
  const snapshot = {
    text: value.text,
    preset: choice(value.preset, [null, ...Object.keys(PRESETS)], 'Espécimen'),
    fontSize: integer(value.fontSize, 14, 48, 'Tamaño'),
    lineHeight: integer(value.lineHeight, 16, 80, 'Altura de línea'),
    views,
    showBoxes: boolean(value.showBoxes, 'Guías de layout'),
    showInk: boolean(value.showInk, 'Guía de tinta'),
    markCount: integer(value.markCount, 0, MAX_MARKS, 'Longitud del hilo'),
    markType: choice(value.markType, Object.keys(MARKS), 'Carácter del hilo'),
    speed: choice(value.speed, [250, 500, 1000], 'Ritmo'),
    inspector: choice(value.inspector, ['graphemes', 'codepoints'], 'Inspector'),
    selected: integer(value.selected, 0, MAX_CODEPOINTS, 'Grafema seleccionado'),
    showEscapes: boolean(value.showEscapes, 'Escapes Unicode'),
  };
  const expected = snapshot.preset === 'spider'
    ? makeSpider(snapshot.markCount, MARKS[snapshot.markType]) : PRESETS[snapshot.preset]?.text;
  requireValue(expected === undefined || expected === snapshot.text, 'El texto no coincide con el espécimen y sus ajustes.');
  return snapshot;
}

export function validateEntry(value) {
  requireValue(record(value), 'Entrada de cuaderno no válida.');
  requireValue(typeof value.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value.id), 'Identificador de experimento no válido.');
  requireValue(typeof value.createdAt === 'string' && value.createdAt.length <= 40 && Number.isFinite(Date.parse(value.createdAt)), 'Fecha de experimento no válida.');
  return { id: value.id, name: experimentName(value.name), createdAt: value.createdAt, snapshot: validateSnapshot(value.snapshot) };
}

export function encodeNotebook(entries) {
  return JSON.stringify({ format: FORMAT, version: 1, experiments: entries.map(validateEntry) }, null, 2);
}

export function decodeNotebook(raw) {
  requireValue(typeof raw === 'string' && new TextEncoder().encode(raw).length <= MAX_IMPORT_BYTES, 'El archivo JSON admite hasta 1 MiB.');
  let value;
  try { value = JSON.parse(raw.replace(/^\uFEFF/u, '')); }
  catch { throw new Error('El archivo no contiene un JSON válido.'); }
  requireValue(record(value) && value.format === FORMAT && value.version === 1, 'Se esperaba un cuaderno de Happy Emotes, versión 1.');
  requireValue(Array.isArray(value.experiments) && value.experiments.length <= MAX_EXPERIMENTS, `El cuaderno admite hasta ${MAX_EXPERIMENTS} experimentos.`);
  const entries = value.experiments.map(validateEntry);
  requireValue(new Set(entries.map(e => e.id)).size === entries.length, 'El archivo contiene identificadores repetidos.');
  return entries;
}

export function mergeExperiments(existing, incoming, newId) {
  const entries = existing.map(validateEntry);
  const ids = new Set(entries.map(e => e.id));
  const signature = entry => JSON.stringify([entry.name, entry.snapshot]);
  const signatures = new Set(entries.map(signature));
  let added = 0;
  let skipped = 0;
  for (const value of incoming) {
    const entry = validateEntry(value);
    const fingerprint = signature(entry);
    if (signatures.has(fingerprint)) { skipped++; continue; }
    if (ids.has(entry.id)) entry.id = newId();
    requireValue(!ids.has(entry.id), 'No se ha podido asignar un identificador nuevo.');
    entries.push(validateEntry(entry));
    ids.add(entry.id);
    signatures.add(fingerprint);
    added++;
  }
  requireValue(entries.length <= MAX_EXPERIMENTS, `No hay espacio: el cuaderno admite ${MAX_EXPERIMENTS} experimentos. Exporta o elimina alguna entrada antes de importar.`);
  return { entries, added, skipped };
}

export function createNotebookStore(getStorage = () => globalThis.localStorage) {
  let cached = [];
  let temporary = false;
  let storage;
  try { storage = getStorage(); storage.getItem(NOTEBOOK_KEY); }
  catch { temporary = true; }
  return {
    get temporary() { return temporary; },
    read() {
      if (temporary) return cached.map(validateEntry);
      let raw;
      try { raw = storage.getItem(NOTEBOOK_KEY); }
      catch { temporary = true; return cached.map(validateEntry); }
      // Invalid stored data is never silently replaced by an empty notebook.
      cached = raw === null ? [] : decodeNotebook(raw);
      return cached.map(validateEntry);
    },
    change(transform) {
      const next = transform(this.read()).map(validateEntry);
      requireValue(next.length <= MAX_EXPERIMENTS, `El cuaderno admite hasta ${MAX_EXPERIMENTS} experimentos.`);
      const encoded = encodeNotebook(next);
      if (!temporary) {
        try { storage.setItem(NOTEBOOK_KEY, encoded); }
        catch { throw new Error('No se ha podido guardar en este navegador. Exporta tu cuaderno y libera espacio antes de intentarlo de nuevo.'); }
      }
      cached = next;
      return next;
    },
    recovery() { return storage?.getItem(NOTEBOOK_KEY) ?? encodeNotebook(cached); },
  };
}
