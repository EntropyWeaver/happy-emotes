import { decodeBrowserCard, encodeBrowserCard, MAX_CARD_BYTES } from './browser-card.js';
import { downloadJSON } from './download.js';

const fontNames = { noto: 'Noto Sans', sans: 'Arial', serif: 'Times New Roman', mono: 'Courier New', system: 'Sistema' };
const fontStates = {
  'bundled-loaded': 'Fuente incluida cargada',
  'bundled-unavailable': 'Fuente incluida sin cargar',
  'local-loaded': 'Archivo local cargado',
  system: 'Familia del sistema sin verificar',
};
const number = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
const difference = new Intl.NumberFormat('es', { maximumFractionDigits: 2, signDisplay: 'exceptZero' });
const date = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });
const dimensions = value => value ? `${value.map(n => number.format(n)).join(' × ')} px` : 'No disponible';
const dimensionDelta = (before, after) => before && after
  ? `${after.map((n, i) => difference.format(n - before[i])).join(' × ')} px` : '—';

function fontDescription(view) {
  const substitution = view.missingLocal ? 'Falta el archivo local · ' : '';
  return `${view.fontStack} · ${substitution}${fontStates[view.fontState]}`;
}

function addRow(body, label, before, after, delta = '—') {
  const row = body.insertRow();
  const title = document.createElement('th');
  title.scope = 'row';
  title.textContent = label;
  row.append(title);
  for (const value of [before, after, delta]) row.insertCell().textContent = value;
}

export function initBrowserCards({ capture, restore, measure }) {
  const get = id => document.getElementById(id);
  const fileInput = get('browser-card-file');
  const exportButton = get('browser-card-export');
  const importButton = get('browser-card-import');
  const repeatButton = get('browser-card-repeat');
  const comparison = get('browser-card-comparison');
  const status = get('browser-card-status');
  let baseline = null;
  let busy = false;

  function render(current) {
    get('browser-card-baseline').textContent = baseline.environment.browser;
    get('browser-card-current').textContent = current.environment.browser;
    get('browser-card-caption').textContent = `Ficha de ${date.format(new Date(baseline.capturedAt))} frente a la medición de ${date.format(new Date(current.capturedAt))}.`;
    const body = get('browser-card-rows');
    body.replaceChildren();
    const environmentLabel = ({ viewportWidth, pixelRatio }) => `${number.format(viewportWidth)} px · DPR ${number.format(pixelRatio)}`;
    addRow(body, 'Ancho de ventana · DPR', environmentLabel(baseline.environment), environmentLabel(current.environment));
    addRow(body, 'Grafemas', baseline.graphemes ?? 'No disponible', current.graphemes ?? 'No disponible',
      baseline.graphemes === null || current.graphemes === null ? '—' : difference.format(current.graphemes - baseline.graphemes));
    for (const id of ['a', 'b']) {
      const label = id.toUpperCase();
      const config = baseline.snapshot.views[id];
      const requested = config.localFont ? 'Archivo local' : fontNames[config.font];
      const a = baseline.views[id];
      const b = current.views[id];
      addRow(body, `${label} · Fuente solicitada`, requested, requested);
      addRow(body, `${label} · Pila CSS aplicada`, fontDescription(a), fontDescription(b));
      addRow(body, `${label} · Caja DOM`, dimensions(a.layout), dimensions(b.layout), dimensionDelta(a.layout, b.layout));
      addRow(body, `${label} · Tinta Canvas`, dimensions(a.ink), dimensions(b.ink), dimensionDelta(a.ink, b.ink));
    }
    comparison.hidden = false;
  }

  async function run(operation) {
    if (busy) return;
    busy = true;
    exportButton.disabled = importButton.disabled = repeatButton.disabled = true;
    status.textContent = 'Preparando medición…';
    try { await operation(); }
    catch (error) { status.textContent = error.message || 'No se pudo completar la operación.'; }
    finally {
      busy = false;
      exportButton.disabled = importButton.disabled = false;
      repeatButton.hidden = !baseline;
      repeatButton.disabled = !baseline;
    }
  }

  async function compare() {
    restore(baseline.snapshot);
    const current = await measure(baseline.snapshot);
    render(current);
    const missing = ['a', 'b'].filter(id => current.views[id].missingLocal).map(id => id.toUpperCase());
    status.textContent = missing.length
      ? `Comparación lista. Falta la fuente local en ${missing.join(' y ')}. Carga el archivo original y vuelve a medir.`
      : 'Comparación lista. Las medidas quedan fijas hasta que vuelvas a medir.';
    status.scrollIntoView({ block: 'nearest' });
  }

  exportButton.addEventListener('click', () => run(async () => {
    const measured = await measure(capture());
    downloadJSON(encodeBrowserCard(measured), 'happy-emotes-ficha.json');
    status.textContent = 'Ficha preparada. Ábrela en Happy Emotes desde el otro navegador.';
  }));
  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    run(async () => {
      if (file.size > MAX_CARD_BYTES) throw new Error('La ficha admite hasta 64 KiB.');
      baseline = decodeBrowserCard(await file.text());
      comparison.hidden = true;
      await compare();
    });
  });
  repeatButton.addEventListener('click', () => run(compare));
}
