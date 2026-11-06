import { PRESETS, MAX_CODEPOINTS, makeSpider, limitText, analyzeText, displayChar, escapedText, canvasEligible } from './core.js';

const $ = id => document.getElementById(id);
const fonts = { noto: '"Noto Lab", sans-serif', sans: 'Arial, sans-serif', serif: '"Times New Roman", serif', mono: '"Courier New", monospace', system: 'system-ui, sans-serif' };
const marks = { homothetic: '\u034B', acute: '\u0301', below: '\u0323', arabic: '\uFC5E' };
const state = { preset: 'spider', selected: 4, inspector: 'graphemes', analysis: null, catalog: {}, unicodeVersion: null };
let measureFrame = 0;
let inputFrame = 0;
let toastTimer;
const ctx = document.createElement('canvas').getContext('2d');

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
}

function updatePresetButtons() {
  document.querySelectorAll('[data-preset]').forEach(button => {
    const active = button.dataset.preset === state.preset;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('spider-controls').hidden = state.preset !== 'spider';
}

function setSpecimen(text, { preset = null, notice = '' } = {}) {
  cancelAnimationFrame(inputFrame);
  const limited = limitText(text);
  $('specimen').value = limited.text;
  $('input-notice').textContent = limited.truncated ? `Límite de ${MAX_CODEPOINTS} puntos de código: se ha conservado el comienzo del texto.` : notice;
  state.preset = preset;
  $('input-help').textContent = PRESETS[preset]?.hint ?? 'Tu texto, tal cual. Explora sus grafemas y prueba distintas reglas de renderizado.';
  updatePresetButtons();
  updateAnalysis(true);
}

function updateAnalysis(selectInteresting = false) {
  const a = analyzeText($('specimen').value);
  state.analysis = a;
  if (selectInteresting || state.selected >= (a.clusters?.length ?? 0)) {
    // Start with a meaningful cluster: the thread, a joined emoji or an accent.
    const interesting = a.clusters?.findIndex(c => Array.from(c.text).length > 1) ?? -1;
    state.selected = Math.max(0, interesting);
  }
  $('stat-codepoints').textContent = a.codepoints;
  $('stat-graphemes').textContent = a.clusters ? a.clusters.length : 'N/D';
  $('stat-utf16').textContent = a.utf16;
  $('stat-utf8').textContent = a.utf8;
  $('input-count').textContent = `${a.codepoints} / ${MAX_CODEPOINTS}`;
  $('escaped').textContent = escapedText(a.text) || '(texto vacío)';
  const nfc = Array.from(a.text.normalize('NFC')).length;
  const nfd = Array.from(a.text.normalize('NFD')).length;
  $('normalization-info').textContent = `NFC: ${nfc} puntos de código · NFD: ${nfd} puntos de código. Normalizar no elimina todas las marcas.`;
  $('normalize-nfc').disabled = !a.text || a.text === a.text.normalize('NFC');
  $('normalize-nfd').disabled = !a.text || a.text === a.text.normalize('NFD');
  $('copy').disabled = !a.text;
  renderInspector();
  renderViews();
}

function renderInspector() {
  const a = state.analysis;
  const available = a.clusters !== null;
  const showClusters = state.inspector === 'graphemes' && available;
  $('tab-graphemes').disabled = !available;
  $('tab-graphemes').setAttribute('aria-pressed', String(showClusters));
  $('tab-codepoints').setAttribute('aria-pressed', String(!showClusters));
  $('grapheme-list').hidden = !showClusters;
  $('inspect-all').hidden = !showClusters;
  $('inspector-help').textContent = !available
    ? 'Este navegador no tiene Intl.Segmenter. Mostramos puntos de código; el número de grafemas no está disponible.'
    : showClusters ? 'Cada ficha es un grafema. Selecciónalo para inspeccionar los puntos de código que lo forman.' : 'El texto completo, punto por punto. UTF-16 indica el intervalo [inicio, fin) dentro del string de JavaScript.';
  const fragment = document.createDocumentFragment();
  if (showClusters) {
    for (const [index, cluster] of a.clusters.entries()) {
      const button = document.createElement('button');
      button.className = 'grapheme-chip';
      button.setAttribute('aria-pressed', String(index === state.selected));
      const length = Array.from(cluster.text).length;
      button.setAttribute('aria-label', `Grafema ${index + 1}, ${length} puntos de código`);
      const glyph = document.createElement('bdi');
      glyph.className = 'glyph';
      glyph.dir = 'auto';
      glyph.textContent = length === 1 ? displayChar(cluster.text) : cluster.text;
      const counter = document.createElement('small');
      counter.textContent = `${length} cp`;
      button.append(glyph, counter);
      button.addEventListener('click', () => {
        state.selected = index;
        // Preserve the focused button for keyboard navigation.
        $('grapheme-list').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
        renderTable();
      });
      fragment.append(button);
    }
  }
  $('grapheme-list').replaceChildren(fragment);
  renderTable();
}

function renderTable() {
  const a = state.analysis;
  const selectedOnly = state.inspector === 'graphemes' && a.clusters !== null;
  const points = selectedOnly ? a.points.filter(p => p.cluster === state.selected) : a.points;
  $('selection-label').textContent = !a.text ? 'Aún no hay texto para inspeccionar' : selectedOnly ? `Grafema ${state.selected + 1} · ${points.length} puntos de código` : `Texto completo · ${points.length} puntos de código`;
  const fragment = document.createDocumentFragment();
  for (const point of points) {
    const row = document.createElement('tr');
    const isMark = point.category.code.startsWith('M');
    row.classList.toggle('is-mark', isMark);
    const glyphCell = document.createElement('td');
    const glyph = document.createElement('span');
    glyph.className = 'glyph-cell';
    glyph.textContent = displayChar(point.char);
    glyph.title = point.code;
    glyphCell.append(glyph);
    const codeCell = document.createElement('td');
    codeCell.textContent = point.code;
    const nameCell = document.createElement('td');
    const record = state.catalog[point.char.codePointAt(0).toString(16).toUpperCase()];
    nameCell.textContent = record?.[0] ?? 'Nombre fuera del catálogo local';
    const categoryCell = document.createElement('td');
    const category = document.createElement('span');
    category.className = `category-tag ${isMark ? '' : 'neutral'}`;
    category.textContent = record?.[1] ?? point.category.code;
    category.title = `${point.category.label}${record ? ` · clase combinante ${record[2]}` : ''}`;
    categoryCell.append(category);
    const offsetCell = document.createElement('td');
    offsetCell.textContent = `[${point.offset}, ${point.end})`;
    row.append(glyphCell, codeCell, nameCell, categoryCell, offsetCell);
    fragment.append(row);
  }
  if (!points.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty-state';
    cell.textContent = 'Escribe algo o elige un espécimen para empezar.';
    row.append(cell);
    fragment.append(row);
  }
  $('codepoint-rows').replaceChildren(fragment);
}

function renderViews() {
  const fontSize = Number($('font-size').value);
  const lineHeight = Number($('line-height').value);
  $('font-size-value').value = `${fontSize} px`;
  $('line-height-value').value = `${lineHeight} px`;
  for (const view of ['a', 'b']) {
    const font = fonts[$(`font-${view}`).value];
    const overflow = $(`overflow-${view}`).value;
    const message = $(`message-${view}`);
    Object.assign(message.style, { fontFamily: font, fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px`, overflow });
    $(`sample-${view}`).textContent = state.analysis.text;
    $(`overflow-badge-${view}`).textContent = overflow;
    $(`css-${view}`).textContent = `font-size: ${fontSize}px; line-height: ${lineHeight}px;\noverflow: ${overflow};`;
    $(`layout-${view}`).hidden = !$('show-boxes').checked;
    $(`baseline-${view}`).hidden = !$('show-boxes').checked;
  }
  const first = $('overflow-a').value;
  const second = $('overflow-b').value;
  $('observation').textContent = !state.analysis.text ? 'Escribe un texto para observar qué espacio reserva el navegador.' : first === second
    ? `Las dos vistas usan overflow: ${first}. Compara las fuentes para observar cómo cambia la composición.`
    : 'Las cajas reservan espacio para el mensaje. Con visible, su tinta puede atravesar otros mensajes; con clip o hidden se recorta en la caja.';
  scheduleMeasurements();
}

function placeBox(element, left, top, width, height) {
  Object.assign(element.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, width)}px`, height: `${Math.max(0, height)}px` });
}

function measureViews() {
  for (const view of ['a', 'b']) {
    const stage = $(`stage-${view}`);
    const message = $(`message-${view}`);
    const sample = $(`sample-${view}`);
    const stageRect = stage.getBoundingClientRect();
    const rect = message.getBoundingClientRect();
    const baseline = message.querySelector('.baseline-anchor').getBoundingClientRect().top - stageRect.top;
    placeBox($(`layout-${view}`), rect.left - stageRect.left, rect.top - stageRect.top, rect.width, rect.height);
    placeBox($(`baseline-${view}`), rect.left - stageRect.left, baseline, rect.width, 0);
    $(`box-metric-${view}`).textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;
    const ink = $(`ink-${view}`);
    ink.hidden = true;
    const metric = $(`ink-metric-${view}`);
    const text = state.analysis.text;
    if (!ctx || !canvasEligible(text)) {
      metric.textContent = text ? 'no disponible' : '—';
      metric.title = 'La estimación se omite para texto vacío, multilínea, tabuladores o ciertos controles.';
      continue;
    }
    const computed = getComputedStyle(sample);
    ctx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.direction = computed.direction;
    if ('fontKerning' in ctx) ctx.fontKerning = computed.fontKerning;
    const m = ctx.measureText(text);
    const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right, actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = m;
    if (![left, right, ascent, descent].every(Number.isFinite)) {
      metric.textContent = 'no disponible';
      continue;
    }
    const width = Math.max(0, left + right);
    const height = Math.max(0, ascent + descent);
    const sampleRect = sample.getBoundingClientRect();
    placeBox(ink, sampleRect.left - stageRect.left - left, baseline - ascent, width, height);
    ink.hidden = !$('show-ink').checked;
    metric.textContent = `≈ ${Math.round(width)} × ${Math.round(height)} px`;
    metric.title = 'Límites estimados de tinta sin recorte en Canvas; no son una medida del DOM.';
  }
}

function scheduleMeasurements() {
  cancelAnimationFrame(measureFrame);
  measureFrame = requestAnimationFrame(measureViews);
}

function regenerateSpider() {
  const count = Number($('mark-count').value);
  $('mark-count-value').value = `${count} marcas`;
  const type = $('mark-type').value;
  $('mark-count-value').value = type === 'arabic' ? `${count} ligaduras` : `${count} marcas`;
  $('mark-note').textContent = type === 'arabic'
    ? 'U+FC5E es una ligadura árabe (Lo), no una marca Mn. Su composición depende de la fuente.'
    : 'Su altura depende de la fuente y del motor tipográfico.';
  setSpecimen(makeSpider(count, marks[type]), { preset: 'spider' });
}

document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
  const preset = button.dataset.preset;
  if (preset === 'spider') regenerateSpider();
  else setSpecimen(PRESETS[preset].text, { preset });
}));

$('specimen').addEventListener('input', event => {
  if (event.isComposing) return;
  cancelAnimationFrame(inputFrame);
  inputFrame = requestAnimationFrame(() => {
    const limited = limitText($('specimen').value);
    if (limited.truncated) $('specimen').value = limited.text;
    $('input-notice').textContent = limited.truncated ? `Límite de ${MAX_CODEPOINTS} puntos de código: se ha conservado el comienzo del texto.` : '';
    state.preset = null;
    $('input-help').textContent = 'Tu texto, tal cual. Explora sus grafemas y prueba distintas reglas de renderizado.';
    updatePresetButtons();
    updateAnalysis(true);
  });
});
$('specimen').addEventListener('compositionend', () => $('specimen').dispatchEvent(new Event('input')));
$('mark-count').addEventListener('input', regenerateSpider);
$('mark-type').addEventListener('change', regenerateSpider);
for (const id of ['font-size', 'line-height', 'show-boxes', 'show-ink']) $(id).addEventListener('input', renderViews);
for (const id of ['font-a', 'font-b', 'overflow-a', 'overflow-b']) $(id).addEventListener('change', renderViews);

$('escaped-toggle').addEventListener('click', () => {
  $('escaped').hidden = !$('escaped').hidden;
  $('escaped-toggle').setAttribute('aria-expanded', String(!$('escaped').hidden));
  $('escaped-toggle').textContent = $('escaped').hidden ? 'Ver escapes' : 'Ocultar escapes';
});

$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('specimen').value);
    toast('Espécimen copiado. 🕷');
  } catch {
    $('specimen').focus();
    $('specimen').select();
    toast('Texto seleccionado. Usa Ctrl+C o ⌘C para copiarlo.');
  }
});

for (const form of ['NFC', 'NFD']) $(`normalize-${form.toLowerCase()}`).addEventListener('click', () => {
  setSpecimen($('specimen').value.normalize(form));
  toast(`Normalización ${form} aplicada.`);
});

for (const mode of ['graphemes', 'codepoints']) $(`tab-${mode}`).addEventListener('click', () => {
  state.inspector = mode;
  renderInspector();
});
$('inspect-all').addEventListener('click', () => {
  state.inspector = 'codepoints';
  renderInspector();
  $('tab-codepoints').focus();
});

$('reset').addEventListener('click', () => {
  cancelAnimationFrame(inputFrame);
  for (const [id, value] of Object.entries({ 'mark-count': 12, 'mark-type': 'homothetic', 'font-size': 28, 'line-height': 36, 'font-a': 'noto', 'font-b': 'noto', 'overflow-a': 'visible', 'overflow-b': 'clip' })) $(id).value = value;
  $('show-boxes').checked = true;
  $('show-ink').checked = false;
  $('escaped').hidden = true;
  $('escaped-toggle').textContent = 'Ver escapes';
  $('escaped-toggle').setAttribute('aria-expanded', 'false');
  state.inspector = 'graphemes';
  regenerateSpider();
  toast('Laboratorio restablecido. Araña localizada.');
});

if (typeof ResizeObserver === 'function') {
  const observer = new ResizeObserver(scheduleMeasurements);
  for (const view of ['a', 'b']) observer.observe($(`message-${view}`));
}
window.addEventListener('resize', scheduleMeasurements);
document.fonts?.ready.then(scheduleMeasurements);
document.fonts?.addEventListener('loadingdone', scheduleMeasurements);

setSpecimen(PRESETS.spider.text, { preset: 'spider' });
fetch('./unicode-names.json').then(response => {
  if (!response.ok) throw new Error('No se pudo cargar el catálogo');
  return response.json();
}).then(data => {
  state.catalog = data.characters;
  state.unicodeVersion = data.version;
  $('catalog-note').textContent = `Nombres y categorías detalladas: catálogo parcial Unicode ${data.version}. Fuera del catálogo se muestra la categoría general del navegador; la segmentación también depende del navegador.`;
  renderTable();
}).catch(() => {
  $('catalog-note').textContent = 'El catálogo de nombres no está disponible. Los puntos de código, las categorías generales y el renderizado siguen funcionando.';
});
