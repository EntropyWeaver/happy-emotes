import { t } from './i18n.js';
import { MAX_CODEPOINTS, MAX_MARKS, PRESETS, makeSpider } from './core.js';

export const NOTEBOOK_KEY = 'happy-emotes:notebook:v1';
export const MAX_EXPERIMENTS = 100;
export const MAX_IMPORT_BYTES = 1024 * 1024;
const FORMAT = 'happy-emotes-notebook';
const MARKS = { homothetic: '\u034B', acute: '\u0301', below: '\u0323', arabic: '\uFC5E' };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function requireValue(valid, message) { if (!valid) throw new Error(message); }
function choice(value, allowed, label) {
  requireValue(allowed.includes(value), t(`${label}: invalid value.`, `${label}: valor no válido.`));
  return value;
}
function integer(value, min, max, label) {
  requireValue(Number.isInteger(value) && value >= min && value <= max, t(`${label}: must be between ${min} and ${max}.`, `${label}: debe estar entre ${min} y ${max}.`));
  return value;
}
function boolean(value, label) {
  requireValue(typeof value === 'boolean', t(`${label}: expected true or false.`, `${label}: se esperaba true o false.`));
  return value;
}
export function experimentName(value) {
  requireValue(typeof value === 'string', t("The experiment needs a name.", "El experimento necesita un nombre."));
  const name = value.replace(/\s+/gu, ' ').trim();
  requireValue(name.length > 0 && name.length <= 80, t("The name must be between 1 and 80 characters.", "El nombre debe tener entre 1 y 80 caracteres."));
  return name;
}

export function validateSnapshot(value) {
  requireValue(record(value), t("Experiment settings are missing.", "Faltan los ajustes del experimento."));
  requireValue(typeof value.text === 'string' && Array.from(value.text).length <= MAX_CODEPOINTS, t(`Text can contain up to ${MAX_CODEPOINTS} code points.`, `El texto admite hasta ${MAX_CODEPOINTS} puntos de código.`));
  requireValue(record(value.views), t("A/B view settings are missing.", "Faltan los ajustes de las vistas A/B."));
  const views = {};
  for (const id of ['a', 'b']) {
    const view = value.views[id];
    requireValue(record(view), t(`View ${id.toUpperCase()} is missing.`, `Falta la vista ${id.toUpperCase()}.`));
    views[id] = {
      font: choice(view.font, ['noto', 'sans', 'serif', 'mono', 'system'], t("Font", "Fuente")),
      overflow: choice(view.overflow, ['visible', 'clip', 'hidden'], 'Overflow'),
      panelOverflow: choice(view.panelOverflow === undefined ? 'hidden' : view.panelOverflow, ['visible', 'hidden'], t("Panel overflow", "Overflow del panel")),
    };
    if (view.localFont !== undefined) {
      requireValue(typeof view.localFont === 'string' && /^[a-f0-9]{64}$/u.test(view.localFont), t("Invalid local font reference.", "Referencia de fuente local no válida."));
      views[id].localFont = view.localFont;
    }
  }
  const snapshot = {
    text: value.text,
    preset: choice(value.preset, [null, ...Object.keys(PRESETS)], t("Specimen", "Espécimen")),
    fontSize: integer(value.fontSize, 14, 48, t("Size", "Tamaño")),
    lineHeight: integer(value.lineHeight, 16, 80, t("Line height", "Altura de línea")),
    views,
    showBoxes: boolean(value.showBoxes, t("Layout guides", "Guías de layout")),
    showInk: boolean(value.showInk, t("Ink guide", "Guía de tinta")),
    markCount: integer(value.markCount, 0, MAX_MARKS, t("Thread length", "Longitud del hilo")),
    markType: choice(value.markType, Object.keys(MARKS), t("Thread character", "Carácter del hilo")),
    speed: choice(value.speed, [250, 500, 1000], t("Speed", "Ritmo")),
    inspector: choice(value.inspector, ['graphemes', 'codepoints'], t("Inspector", "Inspector")),
    selected: integer(value.selected, 0, MAX_CODEPOINTS, t("Selected grapheme", "Grafema seleccionado")),
    showEscapes: boolean(value.showEscapes, t("Unicode escapes", "Escapes Unicode")),
  };
  const expected = snapshot.preset === 'spider'
    ? makeSpider(snapshot.markCount, MARKS[snapshot.markType]) : PRESETS[snapshot.preset]?.text;
  requireValue(expected === undefined || expected === snapshot.text, t("The text does not match the specimen and its settings.", "El texto no coincide con el espécimen y sus ajustes."));
  return snapshot;
}

export function validateEntry(value) {
  requireValue(record(value), t("Invalid notebook entry.", "Entrada de cuaderno no válida."));
  requireValue(typeof value.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value.id), t("Invalid experiment ID.", "Identificador de experimento no válido."));
  requireValue(typeof value.createdAt === 'string' && value.createdAt.length <= 40 && Number.isFinite(Date.parse(value.createdAt)), t("Invalid experiment date.", "Fecha de experimento no válida."));
  return { id: value.id, name: experimentName(value.name), createdAt: value.createdAt, snapshot: validateSnapshot(value.snapshot) };
}

export function encodeNotebook(entries) {
  return JSON.stringify({ format: FORMAT, version: 1, experiments: entries.map(validateEntry) }, null, 2);
}

export function decodeNotebook(raw) {
  requireValue(typeof raw === 'string' && new TextEncoder().encode(raw).length <= MAX_IMPORT_BYTES, t("The JSON file can be up to 1 MiB.", "El archivo JSON admite hasta 1 MiB."));
  let value;
  try { value = JSON.parse(raw.replace(/^\uFEFF/u, '')); }
  catch { throw new Error(t("The file does not contain valid JSON.", "El archivo no contiene un JSON válido.")); }
  requireValue(record(value) && value.format === FORMAT && value.version === 1, t("Expected a Happy Emotes notebook, version 1.", "Se esperaba un cuaderno de Happy Emotes, versión 1."));
  requireValue(Array.isArray(value.experiments) && value.experiments.length <= MAX_EXPERIMENTS, t(`The notebook can hold up to ${MAX_EXPERIMENTS} experiments.`, `El cuaderno admite hasta ${MAX_EXPERIMENTS} experimentos.`));
  const entries = value.experiments.map(validateEntry);
  requireValue(new Set(entries.map(e => e.id)).size === entries.length, t("The file contains duplicate IDs.", "El archivo contiene identificadores repetidos."));
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
    requireValue(!ids.has(entry.id), t("Could not assign a new ID.", "No se ha podido asignar un identificador nuevo."));
    entries.push(validateEntry(entry));
    ids.add(entry.id);
    signatures.add(fingerprint);
    added++;
  }
  requireValue(entries.length <= MAX_EXPERIMENTS, t(`The notebook can hold ${MAX_EXPERIMENTS} experiments. Export or delete an entry before importing.`, `No hay espacio: el cuaderno admite ${MAX_EXPERIMENTS} experimentos. Exporta o elimina alguna entrada antes de importar.`));
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
      requireValue(next.length <= MAX_EXPERIMENTS, t(`The notebook can hold up to ${MAX_EXPERIMENTS} experiments.`, `El cuaderno admite hasta ${MAX_EXPERIMENTS} experimentos.`));
      const encoded = encodeNotebook(next);
      if (!temporary) {
        try { storage.setItem(NOTEBOOK_KEY, encoded); }
        catch { throw new Error(t("Could not save in this browser. Export your notebook and free up space before trying again.", "No se ha podido guardar en este navegador. Exporta tu cuaderno y libera espacio antes de intentarlo de nuevo.")); }
      }
      cached = next;
      return next;
    },
    recovery() { return storage?.getItem(NOTEBOOK_KEY) ?? encodeNotebook(cached); },
  };
}
