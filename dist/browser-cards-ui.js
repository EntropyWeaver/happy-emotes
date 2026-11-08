import { language, onLanguageChange, setMessage, t } from './i18n.js';
import { decodeBrowserCard, encodeBrowserCard, MAX_CARD_BYTES } from './browser-card.js';
import { downloadJSON } from './download.js';

const fontNames = { noto: 'Noto Sans', sans: 'Arial', serif: 'Times New Roman', mono: 'Courier New', get system() { return t("System", "Sistema"); } };
const fontStates = {
  get 'bundled-loaded'() { return t("Bundled font loaded", "Fuente incluida cargada"); },
  get 'bundled-unavailable'() { return t("Bundled font not loaded", "Fuente incluida sin cargar"); },
  get 'local-loaded'() { return t("Local font file loaded", "Archivo local cargado"); },
  get system() { return t("System family unverified", "Familia del sistema sin verificar"); },
};

function fontDescription(view) {
  const substitution = view.missingLocal ? t("Local font file missing · ", "Falta el archivo local · ") : '';
  const stack = view.fontState === 'local-loaded' ? t("Local file, sans-serif", "Fuente de archivo, sans-serif") : view.fontStack;
  return `${stack} · ${substitution}${fontStates[view.fontState]}`;
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
  let lastMeasurement = null;

  function render(current) {
    const number = new Intl.NumberFormat(language(), { maximumFractionDigits: 2 });
    const difference = new Intl.NumberFormat(language(), { maximumFractionDigits: 2, signDisplay: 'exceptZero' });
    const date = new Intl.DateTimeFormat(language(), { dateStyle: 'medium', timeStyle: 'short' });
    const dimensions = value => value ? `${value.map(n => number.format(n)).join(' × ')} px` : t("Unavailable", "No disponible");
    const dimensionDelta = (before, after) => before && after
      ? `${after.map((n, i) => difference.format(n - before[i])).join(' × ')} px` : '—';
    get('browser-card-baseline').textContent = baseline.environment.browser;
    get('browser-card-current').textContent = current.environment.browser;
    get('browser-card-caption').textContent = t(`Record from ${date.format(new Date(baseline.capturedAt))} compared with the measurement from ${date.format(new Date(current.capturedAt))}.`, `Ficha de ${date.format(new Date(baseline.capturedAt))} frente a la medición de ${date.format(new Date(current.capturedAt))}.`);
    const body = get('browser-card-rows');
    body.replaceChildren();
    const environmentLabel = ({ viewportWidth, pixelRatio }) => `${number.format(viewportWidth)} px · DPR ${number.format(pixelRatio)}`;
    addRow(body, t("Viewport width · DPR", "Ancho de ventana · DPR"), environmentLabel(baseline.environment), environmentLabel(current.environment));
    addRow(body, 'Grafemas', baseline.graphemes ?? t("Unavailable", "No disponible"), current.graphemes ?? t("Unavailable", "No disponible"),
      baseline.graphemes === null || current.graphemes === null ? '—' : difference.format(current.graphemes - baseline.graphemes));
    for (const id of ['a', 'b']) {
      const label = id.toUpperCase();
      const config = baseline.snapshot.views[id];
      const requested = config.localFont ? t("Local file", "Archivo local") : fontNames[config.font];
      const a = baseline.views[id];
      const b = current.views[id];
      addRow(body, t(`${label} · Requested font`, `${label} · Fuente solicitada`), requested, requested);
      addRow(body, t(`${label} · Applied CSS stack`, `${label} · Pila CSS aplicada`), fontDescription(a), fontDescription(b));
      addRow(body, t(`${label} · DOM box`, `${label} · Caja DOM`), dimensions(a.layout), dimensions(b.layout), dimensionDelta(a.layout, b.layout));
      addRow(body, t(`${label} · Canvas ink`, `${label} · Tinta Canvas`), dimensions(a.ink), dimensions(b.ink), dimensionDelta(a.ink, b.ink));
    }
    comparison.hidden = false;
  }

  async function run(operation) {
    if (busy) return;
    busy = true;
    exportButton.disabled = importButton.disabled = repeatButton.disabled = true;
    setMessage(status, () => t("Preparing measurement…", "Preparando medición…"));
    try { await operation(); }
    catch (error) { setMessage(status, error.message || t("Could not complete the operation.", "No se pudo completar la operación.")); }
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
    lastMeasurement = current;
    render(current);
    const missing = ['a', 'b'].filter(id => current.views[id].missingLocal).map(id => id.toUpperCase());
    setMessage(status, () => missing.length
      ? t(`Comparison ready. The local font is missing in ${missing.join(t(' and ', ' y '))}. Load the original file and measure again.`, `Comparación lista. Falta la fuente local en ${missing.join(t(' and ', ' y '))}. Carga el archivo original y vuelve a medir.`)
      : t("Comparison ready. The measurements stay fixed until you measure again.", "Comparación lista. Las medidas quedan fijas hasta que vuelvas a medir."));
    status.scrollIntoView({ block: 'nearest' });
  }

  exportButton.addEventListener('click', () => run(async () => {
    const measured = await measure(capture());
    downloadJSON(encodeBrowserCard(measured), 'happy-emotes-ficha.json');
    setMessage(status, () => t("Record ready. Open it in Happy Emotes in another browser.", "Ficha preparada. Ábrela en Happy Emotes desde el otro navegador."));
  }));
  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    run(async () => {
      if (file.size > MAX_CARD_BYTES) throw new Error(t("The record can be up to 64 KiB.", "La ficha admite hasta 64 KiB."));
      baseline = decodeBrowserCard(await file.text());
      lastMeasurement = null;
      comparison.hidden = true;
      await compare();
    });
  });
  repeatButton.addEventListener('click', () => run(compare));
  onLanguageChange(() => {
    status.textContent = '';
    if (lastMeasurement) render(lastMeasurement);
  });
}
