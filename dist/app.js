import { initLanguageSelector, onLanguageChange, setMessage, t } from './i18n.js';
import { PRESETS, MAX_CODEPOINTS, MAX_MARKS, makeSpider, limitText, analyzeText, displayChar, escapedText, canvasEligible } from './core.js';
import { createGraphemeSelection } from './selection.js';
import { createPlayback } from './playback.js';
import { initNotebook } from './notebook-ui.js';
import { initShareLinks } from './share-ui.js';
import { initCreatureBuilder } from './creatures.js';
import { initMovingChat } from './chat.js';
import { initLocalFonts } from './local-fonts.js';
import { initChallenges } from './challenges.js';
import { browserLabel } from './browser-card.js';
import { initBrowserCards } from './browser-cards-ui.js';

const $ = id => document.getElementById(id);
const fonts = { noto: '"Noto Lab", sans-serif', sans: 'Arial, sans-serif', serif: '"Times New Roman", serif', mono: '"Courier New", monospace', system: 'system-ui, sans-serif' };
const marks = { homothetic: '\u034B', acute: '\u0301', below: '\u0323', arabic: '\uFC5E' };
const state = { preset: 'spider', selected: 4, inspector: 'graphemes', analysis: null, catalog: {}, unicodeVersion: null };
let measureFrame = 0;
let inputFrame = 0;
let toastTimer;
const ctx = document.createElement('canvas').getContext('2d');
const connectedSelection = createGraphemeSelection(selectGrapheme);
let announcedPlaybackPhase = '';
const playback = createPlayback({
  getCount: () => Number($('mark-count').value),
  setCount: count => {
    $('mark-count').value = count;
    regenerateSpider({ animated: true });
  },
  getDelay: () => Number($('player-speed').value),
  maximum: MAX_MARKS,
  onChange: renderPlaybackControls,
});

function renderPlaybackControls() {
  const count = Number($('mark-count').value);
  const atEnd = count >= MAX_MARKS;
  const ligature = $('mark-type').value === 'arabic';
  const stepLabel = ligature ? t("ligature", "ligadura") : t("mark", "marca");
  const noun = count === 1 ? stepLabel : ligature ? t("ligatures", "ligaduras") : t("marks", "marcas");
  const phase = playback.playing ? t("Playing", "Reproduciendo") : atEnd ? t("Complete", "Completado") : t("Paused", "En pausa");
  $('player-status').textContent = t(`${phase} · ${count} of ${MAX_MARKS} ${noun}`, `${phase} · ${count} de ${MAX_MARKS} ${noun}`);
  $('player-progress').value = count;
  $('player-progress').setAttribute('aria-valuetext', t(`${count} of ${MAX_MARKS} ${noun}`, `${count} de ${MAX_MARKS} ${noun}`));
  $('player-label').textContent = playback.playing ? t("Pause", "Pausar") : atEnd ? t("Replay", "Repetir") : t("Play", "Reproducir");
  $('player-icon').textContent = playback.playing ? 'Ⅱ' : '▶';
  $('player-step').disabled = atEnd;
  $('player-rewind').disabled = count === 0 && !playback.playing;
  $('player-step-label').textContent = stepLabel;
  // Announce transport changes, not a stream of counts several times a second.
  $('connected-selection').setAttribute('aria-live', playback.playing ? 'off' : 'polite');
  $('mark-count-value').setAttribute('aria-live', playback.playing ? 'off' : 'polite');
  if (phase !== announcedPlaybackPhase) {
    $('player-announcement').textContent = `${phase}. ${count} ${noun}.`;
    announcedPlaybackPhase = phase;
  }
}

function selectGrapheme(index) {
  if (!state.analysis.clusters?.[index]) return;
  playback.pause();
  state.selected = index;
  // Keep keyboard focus on the original chip or table button.
  $('grapheme-list').querySelectorAll('button').forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === index));
  });
  if (state.inspector === 'graphemes') renderTable();
  else updateSelectedRows();
  renderSelectionControls();
  scheduleMeasurements();
}

function codepointCount(count) {
  const unit = count === 1 ? t("code point", "punto de código") : t("code points", "puntos de código");
  return `${count} ${unit}`;
}

function renderSelectionControls() {
  const clusters = state.analysis.clusters;
  const cluster = clusters?.[state.selected];
  const count = cluster ? Array.from(cluster.text).length : 0;
  $('selected-preview').textContent = cluster ? (count === 1 ? displayChar(cluster.text) : cluster.text) : '—';
  $('connected-selection').textContent = cluster
    ? t(`Grapheme ${state.selected + 1} of ${clusters.length}`, `Grafema ${state.selected + 1} de ${clusters.length}`) + ` · ${codepointCount(count)}`
    : clusters === null ? t("Grapheme selection unavailable", "Selección de grafemas no disponible") : t("No graphemes yet", "Aún no hay grafemas");
  $('connected-help').textContent = clusters === null
    ? t("This browser does not support grapheme segmentation.", "Este navegador no dispone de segmentación de grafemas.")
    : !cluster ? t("Enter text or choose a specimen to start.", "Escribe un texto o elige un espécimen para empezar.")
      : t("Select a chip in the inspector or a character in A/B.", "Pulsa una ficha del inspector o un carácter en A/B.");
  $('previous-grapheme').disabled = !cluster || state.selected === 0;
  $('next-grapheme').disabled = !cluster || state.selected === clusters.length - 1;
}

function updateSelectedRows() {
  $('codepoint-rows').querySelectorAll('tr[data-cluster]').forEach(row => {
    const selected = Number(row.dataset.cluster) === state.selected;
    row.classList.toggle('is-selected', selected);
    row.querySelector('button')?.setAttribute('aria-pressed', String(selected));
  });
}

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
  $('spider-player').hidden = state.preset !== 'spider';
}

function renderInputHelp() {
  $('input-help').textContent = PRESETS[state.preset]?.hint ?? t("Your text as entered. Explore its graphemes and try different rendering rules.", "Tu texto, tal cual. Explora sus grafemas y prueba distintas reglas de renderizado.");
}

function setSpecimen(text, { preset = null, animated = false, preserveSelection = false } = {}) {
  if (!animated) playback.pause();
  cancelAnimationFrame(inputFrame);
  const limited = limitText(text);
  $('specimen').value = limited.text;
  setMessage($('input-notice'), limited.truncated ? () => t(`The limit is ${MAX_CODEPOINTS} code points. The beginning of the text was kept.`, `Límite de ${MAX_CODEPOINTS} puntos de código: se ha conservado el comienzo del texto.`) : '');
  state.preset = preset;
  renderInputHelp();
  updatePresetButtons();
  updateAnalysis(!animated && !preserveSelection);
  renderPlaybackControls();
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
  $('stat-graphemes').textContent = a.clusters ? a.clusters.length : t("N/A", "N/D");
  $('stat-utf16').textContent = a.utf16;
  $('stat-utf8').textContent = a.utf8;
  $('input-count').textContent = `${a.codepoints} / ${MAX_CODEPOINTS}`;
  $('escaped').textContent = escapedText(a.text) || t("(empty text)", "(texto vacío)");
  const nfc = Array.from(a.text.normalize('NFC')).length;
  const nfd = Array.from(a.text.normalize('NFD')).length;
  $('normalization-info').textContent = t(`NFC: ${nfc} code points · NFD: ${nfd} code points. Normalization can leave some marks in place.`, `NFC: ${nfc} puntos de código · NFD: ${nfd} puntos de código. Normalizar no elimina todas las marcas.`);
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
    ? t("This browser lacks Intl.Segmenter. Code points are shown and the grapheme count is unavailable.", "Este navegador no tiene Intl.Segmenter. Mostramos puntos de código; el número de grafemas no está disponible.")
    : showClusters ? t("Each chip is a grapheme. Select it to highlight it in A/B and see its code points here.", "Cada ficha es un grafema. Selecciónalo: se ilumina en A y B y aquí aparecen sus puntos de código.") : t("The whole text, one code point at a time. Select a character to locate its grapheme in A/B and highlight its rows in green. UTF-16 shows the JavaScript [start, end) range.", "El texto completo, punto por punto. Pulsa un carácter para localizar su grafema en A/B; sus filas se marcan en verde. UTF-16 indica el intervalo [inicio, fin) en JavaScript.");
  const fragment = document.createDocumentFragment();
  if (showClusters) {
    for (const [index, cluster] of a.clusters.entries()) {
      const button = document.createElement('button');
      button.className = 'grapheme-chip';
      button.setAttribute('aria-pressed', String(index === state.selected));
      const length = Array.from(cluster.text).length;
      button.setAttribute('aria-label', t(`Grapheme ${index + 1}`, `Grafema ${index + 1}`) + `, ${codepointCount(length)}`);
      const glyph = document.createElement('bdi');
      glyph.className = 'glyph';
      glyph.dir = 'auto';
      glyph.textContent = length === 1 ? displayChar(cluster.text) : cluster.text;
      const counter = document.createElement('small');
      counter.textContent = `${length} cp`;
      button.append(glyph, counter);
      button.addEventListener('click', () => selectGrapheme(index));
      button.addEventListener('keydown', event => {
        const next = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: a.clusters.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        const target = Math.max(0, Math.min(a.clusters.length - 1, next));
        selectGrapheme(target);
        $('grapheme-list').children[target].focus();
      });
      fragment.append(button);
    }
  }
  $('grapheme-list').replaceChildren(fragment);
  renderTable();
  renderSelectionControls();
}

function renderTable() {
  const a = state.analysis;
  const selectedOnly = state.inspector === 'graphemes' && a.clusters !== null;
  const points = selectedOnly ? a.points.filter(p => p.cluster === state.selected) : a.points;
  const countLabel = codepointCount(points.length);
  $('selection-label').textContent = !a.text ? t("No text to inspect yet", "Aún no hay texto para inspeccionar") : selectedOnly ? t(`Grapheme ${state.selected + 1} · ${countLabel}`, `Grafema ${state.selected + 1} · ${countLabel}`) : t(`Full text · ${countLabel}`, `Texto completo · ${countLabel}`);
  const fragment = document.createDocumentFragment();
  for (const point of points) {
    const row = document.createElement('tr');
    if (point.cluster !== null) row.dataset.cluster = point.cluster;
    const isMark = point.category.code.startsWith('M');
    row.classList.toggle('is-mark', isMark);
    const glyphCell = document.createElement('td');
    const linked = !selectedOnly && point.cluster !== null;
    const glyph = document.createElement(linked ? 'button' : 'span');
    glyph.className = 'glyph-cell';
    glyph.textContent = displayChar(point.char);
    glyph.title = point.code;
    if (linked) {
      glyph.classList.add('codepoint-select');
      glyph.setAttribute('aria-label', t(`${point.code}: select grapheme ${point.cluster + 1}`, `${point.code}: seleccionar grafema ${point.cluster + 1}`));
      glyph.addEventListener('click', () => selectGrapheme(point.cluster));
    }
    glyphCell.append(glyph);
    const codeCell = document.createElement('td');
    codeCell.textContent = point.code;
    const nameCell = document.createElement('td');
    const record = state.catalog[point.char.codePointAt(0).toString(16).toUpperCase()];
    nameCell.textContent = record?.[0] ?? t("Name outside the local catalog", "Nombre fuera del catálogo local");
    const categoryCell = document.createElement('td');
    const category = document.createElement('span');
    category.className = `category-tag ${isMark ? '' : 'neutral'}`;
    category.textContent = record?.[1] ?? point.category.code;
    category.title = `${point.category.label}${record ? t(` · combining class ${record[2]}`, ` · clase combinante ${record[2]}`) : ''}`;
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
    cell.textContent = t("Enter text or choose a specimen to start.", "Escribe algo o elige un espécimen para empezar.");
    row.append(cell);
    fragment.append(row);
  }
  $('codepoint-rows').replaceChildren(fragment);
  updateSelectedRows();
}

function renderViews() {
  $('chat-send').disabled = !state.analysis.text;
  const fontSize = Number($('font-size').value);
  const lineHeight = Number($('line-height').value);
  $('font-size-value').value = `${fontSize} px`;
  $('line-height-value').value = `${lineHeight} px`;
  for (const view of ['a', 'b']) {
    const fontId = $(`font-${view}`).value;
    const font = localFonts.family(fontId) ?? fonts[fontId];
    const overflow = $(`overflow-${view}`).value;
    const panelOverflow = $(`panel-overflow-${view}`).value;
    const stage = $(`stage-${view}`);
    stage.dataset.panelOverflow = panelOverflow;
    const message = $(`message-${view}`);
    Object.assign(message.style, { fontFamily: font, fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px`, overflow });
    const sample = $(`sample-${view}`);
    if (sample.textContent !== state.analysis.text) sample.textContent = state.analysis.text;
    $(`overflow-badge-${view}`).textContent = t(`Message · ${overflow}`, `Mensaje · ${overflow}`);
    $(`css-${view}`).textContent = t(`font-size: ${fontSize}px; line-height: ${lineHeight}px;\nMessage · overflow: ${overflow};\nPanel · overflow: ${panelOverflow};`, `font-size: ${fontSize}px; line-height: ${lineHeight}px;\nMensaje · overflow: ${overflow};\nPanel · overflow: ${panelOverflow};`);
    $(`layout-${view}`).hidden = !$('show-boxes').checked;
    $(`baseline-${view}`).hidden = !$('show-boxes').checked;
  }
  $('observation').textContent = state.analysis.text
    ? t("Message controls clipping at the blue box. Panel controls the dark chat boundary. Set Message to visible and compare the Panel options.", "Mensaje controla el recorte en la caja azul. Panel controla el borde oscuro del chat. Elige visible en Mensaje y compara las opciones de Panel.")
    : t("Enter text to see how much space the browser reserves.", "Escribe un texto para observar qué espacio reserva el navegador.");
  scheduleMeasurements();
}

function placeBox(element, left, top, width, height) {
  Object.assign(element.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, width)}px`, height: `${Math.max(0, height)}px` });
}

function measureViews() {
  chat.position();
  const views = {};
  for (const view of ['a', 'b']) {
    const stage = $(`stage-${view}`);
    const message = $(`message-${view}`);
    const sample = $(`sample-${view}`);
    const stageRect = stage.getBoundingClientRect();
    const rect = message.getBoundingClientRect();
    const measurement = { message: rect, ink: null };
    views[view] = measurement;
    const baseline = message.querySelector('.baseline-anchor').getBoundingClientRect().top - stageRect.top;
    placeBox($(`layout-${view}`), rect.left - stageRect.left, rect.top - stageRect.top, rect.width, rect.height);
    placeBox($(`baseline-${view}`), rect.left - stageRect.left, baseline, rect.width, 0);
    $(`box-metric-${view}`).textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;
    const ink = $(`ink-${view}`);
    ink.hidden = true;
    const metric = $(`ink-metric-${view}`);
    const text = state.analysis.text;
    if (!ctx || !canvasEligible(text)) {
      metric.textContent = text ? t("unavailable", "no disponible") : '—';
      metric.title = t("The estimate is omitted for empty text, multiple lines, tabs, or certain control characters.", "La estimación se omite para texto vacío, multilínea, tabuladores o ciertos controles.");
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
      metric.textContent = t("unavailable", "no disponible");
      continue;
    }
    const width = Math.max(0, left + right);
    const height = Math.max(0, ascent + descent);
    const sampleRect = sample.getBoundingClientRect();
    const inkLeft = sampleRect.left - left;
    const inkTop = baseline - ascent;
    placeBox(ink, inkLeft - stageRect.left, inkTop, width, height);
    measurement.ink = { left: inkLeft, top: inkTop + stageRect.top, width, height };
    ink.hidden = !$('show-ink').checked;
    metric.textContent = `≈ ${Math.round(width)} × ${Math.round(height)} px`;
    metric.title = t("Unclipped ink bounds estimated with Canvas. DOM ink can differ.", "Límites estimados de tinta sin recorte en Canvas; no son una medida del DOM.");
  }
  connectedSelection.render(state.analysis, state.selected);
  return views;
}

function scheduleMeasurements() {
  cancelAnimationFrame(measureFrame);
  measureFrame = requestAnimationFrame(measureViews);
}

function updateSpiderControls() {
  const count = Number($('mark-count').value);
  const type = $('mark-type').value;
  const noun = type === 'arabic'
    ? count === 1 ? t("ligature", "ligadura") : t("ligatures", "ligaduras")
    : count === 1 ? t("mark", "marca") : t("marks", "marcas");
  $('mark-count-value').value = `${count} ${noun}`;
  $('mark-note').textContent = type === 'arabic'
    ? t("U+FC5E is an Arabic ligature (Lo). Its shaping depends on the font.", "U+FC5E es una ligadura árabe (Lo), no una marca Mn. Su composición depende de la fuente.")
    : t("Its height depends on the font and rendering engine.", "Su altura depende de la fuente y del motor tipográfico.");
}

function regenerateSpider({ animated = false } = {}) {
  updateSpiderControls();
  setSpecimen(makeSpider(Number($('mark-count').value), marks[$('mark-type').value]), { preset: 'spider', animated });
}

function readSpecimen() {
  cancelAnimationFrame(inputFrame);
  const text = limitText($('specimen').value).text;
  if (text !== state.analysis.text) setSpecimen(text);
  return state.analysis;
}

function readChallengeInk() {
  playback.pause();
  const { text } = readSpecimen();
  const { ink, message } = measureViews().a;
  if (!ink?.width || !ink.height) return null;
  const panelOverflow = $('panel-overflow-a').value;
  const panel = $(panelOverflow === 'visible' ? 'stage-window-a' : 'stage-a').getBoundingClientRect();
  // Use the same Canvas estimate as the ink guide, limited to the panel's clip.
  const top = Math.max(ink.top, panel.top);
  const bottom = Math.min(ink.top + ink.height, panel.bottom);
  const insideWidth = Math.min(ink.left + ink.width, panel.right) - Math.max(ink.left, panel.left);
  const overhang = insideWidth > 0 && (
    Math.min(bottom, message.top) - top > 1 ||
    bottom - Math.max(top, message.bottom) > 1
  );
  return {
    overhang,
    overflow: getComputedStyle($('message-a')).overflowY,
    settings: JSON.stringify([text, $('font-a').value, $('font-size').value, $('line-height').value, panelOverflow]),
  };
}

function captureExperiment() {
  playback.pause();
  const { text } = readSpecimen();
  return {
    text, preset: state.preset,
    fontSize: Number($('font-size').value), lineHeight: Number($('line-height').value),
    views: Object.fromEntries(['a', 'b'].map(view => {
      const font = $(`font-${view}`).value;
      return [view, {
        ...(localFonts.has(font) ? { font: 'noto', localFont: font } : { font }),
        overflow: $(`overflow-${view}`).value,
        panelOverflow: $(`panel-overflow-${view}`).value,
      }];
    })),
    showBoxes: $('show-boxes').checked, showInk: $('show-ink').checked,
    markCount: Number($('mark-count').value), markType: $('mark-type').value,
    speed: Number($('player-speed').value), inspector: state.inspector,
    selected: state.selected, showEscapes: !$('escaped').hidden,
  };
}

async function measureBrowserCard(snapshot) {
  const renderingKey = ({ text, fontSize, lineHeight, views }) => JSON.stringify([text, fontSize, lineHeight, views]);
  const expected = renderingKey(captureExperiment());
  // Flush layout so the font set includes faces needed by the restored text.
  $('message-a').getBoundingClientRect();
  await document.fonts?.ready;
  const applied = captureExperiment();
  if (expected !== renderingKey(applied)) throw new Error(t("The experiment changed during measurement. Please try again.", "El experimento cambió durante la medición. Vuelve a intentarlo."));
  const measurements = measureViews();
  const notoLoaded = document.fonts && [...document.fonts].some(face =>
    face.family.replace(/^["']|["']$/gu, '') === 'Noto Lab' && face.status === 'loaded'
  );
  const size = ({ width, height }) => [width, height].map(n => Math.round(n * 100) / 100);
  const views = {};
  for (const id of ['a', 'b']) {
    const { ink, message } = measurements[id];
    const { font, localFont } = applied.views[id];
    let fontState = 'system';
    if (localFont) fontState = 'local-loaded';
    else if (font === 'noto') fontState = notoLoaded ? 'bundled-loaded' : 'bundled-unavailable';
    views[id] = {
      layout: size(message),
      ink: ink ? size(ink) : null,
      fontStack: localFont ? 'local-font, sans-serif' : getComputedStyle($(`sample-${id}`)).fontFamily,
      fontState,
      missingLocal: Boolean(snapshot.views[id].localFont && snapshot.views[id].localFont !== localFont),
    };
  }
  return {
    capturedAt: new Date().toISOString(),
    environment: { browser: browserLabel(navigator.userAgent), viewportWidth: document.documentElement.clientWidth, pixelRatio: window.devicePixelRatio },
    snapshot,
    graphemes: state.analysis.clusters?.length ?? null,
    views,
  };
}

function restoreExperiment(snapshot) {
  playback.pause();
  chat.reset();
  cancelAnimationFrame(inputFrame);
  for (const [id, value] of Object.entries({ 'font-size': snapshot.fontSize, 'line-height': snapshot.lineHeight, 'mark-count': snapshot.markCount, 'mark-type': snapshot.markType, 'player-speed': snapshot.speed })) $(id).value = value;
  const missingFonts = [];
  for (const view of ['a', 'b']) {
    const { font, localFont } = snapshot.views[view];
    $(`font-${view}`).value = localFonts.has(localFont) ? localFont : font;
    if (localFont && !localFonts.has(localFont)) missingFonts.push(view.toUpperCase());
    $(`overflow-${view}`).value = snapshot.views[view].overflow;
    $(`panel-overflow-${view}`).value = snapshot.views[view].panelOverflow;
  }
  $('show-boxes').checked = snapshot.showBoxes;
  $('show-ink').checked = snapshot.showInk;
  $('escaped').hidden = !snapshot.showEscapes;
  $('escaped-toggle').setAttribute('aria-expanded', String(snapshot.showEscapes));
  $('escaped-toggle').textContent = snapshot.showEscapes ? t("Hide escapes", "Ocultar escapes") : t("Show escapes", "Ver escapes");
  state.inspector = snapshot.inspector;
  state.selected = snapshot.selected;
  updateSpiderControls();
  setSpecimen(snapshot.text, { preset: snapshot.preset, preserveSelection: true });
  localFonts.warnMissing(missingFonts);
  toast(missingFonts.length ? t("Experiment restored with fallback fonts.", "Experimento recuperado con fuentes de sustitución.") : t("Experiment restored and paused.", "Experimento recuperado, en pausa."));
  return missingFonts;
}

document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
  const preset = button.dataset.preset;
  if (preset === 'spider') regenerateSpider();
  else setSpecimen(PRESETS[preset].text, { preset });
}));

$('specimen').addEventListener('input', event => {
  playback.pause();
  if (event.isComposing) return;
  cancelAnimationFrame(inputFrame);
  inputFrame = requestAnimationFrame(() => {
    const limited = limitText($('specimen').value);
    if (limited.truncated) $('specimen').value = limited.text;
    setMessage($('input-notice'), limited.truncated ? () => t(`The limit is ${MAX_CODEPOINTS} code points. The beginning of the text was kept.`, `Límite de ${MAX_CODEPOINTS} puntos de código: se ha conservado el comienzo del texto.`) : '');
    state.preset = null;
    renderInputHelp();
    updatePresetButtons();
    updateAnalysis(true);
  });
});
$('specimen').addEventListener('compositionstart', () => playback.pause());
$('specimen').addEventListener('compositionend', () => $('specimen').dispatchEvent(new Event('input')));
$('mark-count').addEventListener('input', regenerateSpider);
$('mark-type').addEventListener('change', regenerateSpider);
for (const id of ['font-size', 'line-height', 'show-boxes', 'show-ink']) $(id).addEventListener('input', renderViews);
for (const id of ['font-a', 'font-b', 'overflow-a', 'overflow-b', 'panel-overflow-a', 'panel-overflow-b']) $(id).addEventListener('change', renderViews);
$('previous-grapheme').addEventListener('click', () => selectGrapheme(state.selected - 1));
$('next-grapheme').addEventListener('click', () => selectGrapheme(state.selected + 1));
$('player-toggle').addEventListener('click', () => playback.playing ? playback.pause() : playback.play());
$('player-rewind').addEventListener('click', () => playback.rewind());
$('player-step').addEventListener('click', () => {
  playback.step();
  $('player-announcement').textContent = t(`Step: ${$('mark-count').value} additions, ${state.analysis.codepoints} code points.`, `Paso: ${$('mark-count').value} incorporaciones, ${state.analysis.codepoints} puntos de código.`);
});
$('player-speed').addEventListener('change', () => playback.changeSpeed());
$('anatomia').addEventListener('focusin', () => { if (playback.playing) playback.pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) playback.pause(); });
window.addEventListener('pagehide', () => playback.pause());

$('escaped-toggle').addEventListener('click', () => {
  $('escaped').hidden = !$('escaped').hidden;
  $('escaped-toggle').setAttribute('aria-expanded', String(!$('escaped').hidden));
  $('escaped-toggle').textContent = $('escaped').hidden ? t("Show escapes", "Ver escapes") : t("Hide escapes", "Ocultar escapes");
});

$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('specimen').value);
    toast(t("Specimen copied. 🕷", "Espécimen copiado. 🕷"));
  } catch {
    $('specimen').focus();
    $('specimen').select();
    toast(t("Text selected. Use Ctrl+C or ⌘C to copy.", "Texto seleccionado. Usa Ctrl+C o ⌘C para copiarlo."));
  }
});

for (const form of ['NFC', 'NFD']) $(`normalize-${form.toLowerCase()}`).addEventListener('click', () => {
  setSpecimen($('specimen').value.normalize(form));
  toast(t(`Applied ${form} normalization.`, `Normalización ${form} aplicada.`));
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
  playback.pause();
  chat.reset();
  $('player-speed').value = '500';
  cancelAnimationFrame(inputFrame);
  for (const [id, value] of Object.entries({ 'mark-count': 12, 'mark-type': 'homothetic', 'font-size': 28, 'line-height': 36, 'font-a': 'noto', 'font-b': 'noto', 'overflow-a': 'visible', 'overflow-b': 'clip', 'panel-overflow-a': 'hidden', 'panel-overflow-b': 'hidden' })) $(id).value = value;
  $('show-boxes').checked = true;
  $('show-ink').checked = false;
  $('escaped').hidden = true;
  $('escaped-toggle').textContent = t("Show escapes", "Ver escapes");
  $('escaped-toggle').setAttribute('aria-expanded', 'false');
  state.inspector = 'graphemes';
  regenerateSpider();
  toast(t("Lab reset. Spider located.", "Laboratorio restablecido. Araña localizada."));
});

if (typeof ResizeObserver === 'function') {
  const observer = new ResizeObserver(scheduleMeasurements);
  for (const view of ['a', 'b']) observer.observe($(`message-${view}`));
}
window.addEventListener('resize', scheduleMeasurements);
document.fonts?.ready.then(scheduleMeasurements);
document.fonts?.addEventListener('loadingdone', scheduleMeasurements);

initLanguageSelector();
const chat = initMovingChat({ onMove: scheduleMeasurements });
const localFonts = initLocalFonts({ onChange: renderViews });
setSpecimen(PRESETS.spider.text, { preset: 'spider' });
updateSpiderControls();
initChallenges({ readText: readSpecimen, readInk: readChallengeInk, prepareAccent: setSpecimen });
$('render-title').tabIndex = -1;
initNotebook({ capture: captureExperiment, restore: restoreExperiment, pause: () => playback.pause() });
initShareLinks({ capture: captureExperiment, restore: restoreExperiment });
initBrowserCards({ capture: captureExperiment, restore: restoreExperiment, measure: measureBrowserCard });
const refreshCreatureDetails = initCreatureBuilder({
  getText: () => $('specimen').value,
  setText: setSpecimen,
  getRecord: char => state.catalog[char.codePointAt(0).toString(16).toUpperCase()],
});
fetch('./unicode-names.json').then(response => {
  if (!response.ok) throw new Error(t("Could not load the catalog", "No se pudo cargar el catálogo"));
  return response.json();
}).then(data => {
  state.catalog = data.characters;
  state.unicodeVersion = data.version;
  refreshCreatureDetails();
  setMessage($('catalog-note'), () => t(`Names and detailed categories come from a partial Unicode ${data.version} catalog. Other characters use the browser’s general categories. Segmentation also depends on the browser.`, `Nombres y categorías detalladas: catálogo parcial Unicode ${data.version}. Fuera del catálogo se muestra la categoría general del navegador; la segmentación también depende del navegador.`));
  renderTable();
}).catch(() => {
  setMessage($('catalog-note'), () => t("The name catalog is unavailable. Code points, general categories, and rendering still work.", "El catálogo de nombres no está disponible. Los puntos de código, las categorías generales y el renderizado siguen funcionando."));
});

onLanguageChange(() => {
  renderInputHelp();
  updateSpiderControls();
  updateAnalysis();
  renderPlaybackControls();
  $('escaped-toggle').textContent = $('escaped').hidden ? t("Show escapes", "Ver escapes") : t("Hide escapes", "Ocultar escapes");
  $('toast').classList.remove('show');
});
