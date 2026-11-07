import { createNotebookStore, decodeNotebook, encodeNotebook, experimentName, mergeExperiments, validateEntry, MAX_EXPERIMENTS, MAX_IMPORT_BYTES, NOTEBOOK_KEY } from './notebook.js';

const $ = id => document.getElementById(id);
const fontNames = { noto: 'Noto Sans', sans: 'Arial / sans', serif: 'Times / serif', mono: 'Courier / mono', system: 'Sistema' };
const newId = () => globalThis.crypto?.randomUUID?.() ?? `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function downloadJSON(raw, filename) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initNotebook({ capture, restore, pause }) {
  const store = createNotebookStore();
  let entries = [];
  let renaming = null;
  let deleted = null;
  let damaged = false;
  const message = text => { $('notebook-status').textContent = text; };
  const report = error => message(error.message || 'No se ha podido completar la operación.');

  function endRename() {
    renaming = null;
    $('experiment-name').value = '';
    $('notebook-save').textContent = 'Guardar experimento';
    $('notebook-cancel').hidden = true;
  }

  function refresh() {
    try { entries = store.read(); damaged = false; }
    catch (error) { damaged = true; entries = []; report(error); }
    $('notebook-save').disabled = damaged || (!renaming && entries.length >= MAX_EXPERIMENTS);
    $('notebook-import').disabled = damaged;
    $('notebook-export').disabled = !damaged && entries.length === 0;
    $('notebook-export').textContent = damaged ? 'Descargar copia original' : 'Exportar JSON';
    $('notebook-count').textContent = `${entries.length} / ${MAX_EXPERIMENTS} experimentos`;
    $('notebook-storage').textContent = damaged
      ? 'No se ha podido leer el cuaderno guardado. Sus datos se conservan; descarga la copia original para recuperarlos.'
      : store.temporary ? 'Guardado temporal: este navegador bloquea el almacenamiento. Exporta JSON antes de cerrar esta pestaña.'
        : 'Guardado en este navegador. Exporta JSON para compartirlo o llevarlo a otro equipo.';
    $('notebook-storage').classList.toggle('notebook-warning', store.temporary || damaged);
    $('notebook-empty').hidden = entries.length > 0;
    $('notebook-list').replaceChildren();
    for (const entry of [...entries].reverse()) {
      const card = document.createElement('article');
      card.className = 'experiment-card';
      card.dataset.experimentId = entry.id;
      const heading = document.createElement('h3');
      heading.textContent = entry.name;
      heading.dir = 'auto';
      const preview = document.createElement('bdi');
      preview.className = 'experiment-preview';
      preview.dir = 'auto';
      preview.textContent = entry.snapshot.text || '(texto vacío)';
      const details = document.createElement('p');
      details.className = 'experiment-details';
      details.textContent = `${Array.from(entry.snapshot.text).length} puntos de código · ${entry.snapshot.fontSize} px · línea ${entry.snapshot.lineHeight} px`;
      const views = document.createElement('div');
      views.className = 'experiment-views';
      for (const id of ['a', 'b']) {
        const tag = document.createElement('span');
        const view = entry.snapshot.views[id];
        tag.textContent = `${id.toUpperCase()} · ${fontNames[view.font]} · ${view.overflow}`;
        if (view.panelOverflow === 'visible') tag.textContent += ' · panel visible';
        views.append(tag);
      }
      const date = document.createElement('time');
      date.dateTime = entry.createdAt;
      date.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt));
      const actions = document.createElement('div');
      actions.className = 'experiment-actions';
      function action(label, callback, primary = false) {
        const button = document.createElement('button');
        button.textContent = label;
        button.className = primary ? 'notebook-primary' : 'notebook-button';
        button.setAttribute('aria-label', `${label}: ${entry.name}`);
        button.addEventListener('click', () => {
          try { callback(); } catch (error) { report(error); }
        });
        actions.append(button);
      }
      action('Abrir', () => {
        pause();
        endRename();
        restore(entry.snapshot);
        refresh();
        message(`Abierto «${entry.name}», en pausa.`);
        $('render-title').scrollIntoView({ block: 'start' });
        $('render-title').focus({ preventScroll: true });
      }, true);
      action('Renombrar', () => {
        pause();
        renaming = entry.id;
        $('experiment-name').value = entry.name;
        $('notebook-save').textContent = 'Guardar nombre';
        $('notebook-save').disabled = false;
        $('notebook-cancel').hidden = false;
        $('experiment-name').focus();
      });
      action('Eliminar', () => {
        store.change(current => current.filter(item => item.id !== entry.id));
        deleted = entry;
        $('notebook-undo').hidden = false;
        if (renaming === entry.id) endRename();
        refresh();
        message(`Eliminado «${entry.name}». Puedes deshacerlo.`);
        $('notebook-undo').focus();
      });
      card.append(heading, preview, details, views, date, actions);
      $('notebook-list').append(card);
    }
  }

  $('notebook-form').addEventListener('submit', event => {
    event.preventDefault();
    pause();
    try {
      const name = experimentName($('experiment-name').value);
      if (renaming) {
        const id = renaming;
        store.change(current => {
          if (!current.some(entry => entry.id === id)) throw new Error('Esta entrada ya no está en el cuaderno.');
          return current.map(entry => entry.id === id ? { ...entry, name } : entry);
        });
      } else {
        const entry = validateEntry({ id: newId(), name, createdAt: new Date().toISOString(), snapshot: capture() });
        store.change(current => [...current, entry]);
      }
      endRename();
      refresh();
      message(`${store.temporary ? 'Conservado temporalmente' : 'Guardado'}: «${name}».`);
    } catch (error) { report(error); }
  });
  $('notebook-cancel').addEventListener('click', () => { endRename(); refresh(); });
  $('notebook-undo').addEventListener('click', () => {
    try {
      if (!deleted) return;
      store.change(current => mergeExperiments(current, [deleted], newId).entries);
      deleted = null;
      $('notebook-undo').hidden = true;
      refresh();
      message('Entrada recuperada.');
      $('notebook-save').focus();
    } catch (error) { report(error); }
  });
  $('notebook-export').addEventListener('click', () => {
    pause();
    try {
      downloadJSON(damaged ? store.recovery() : encodeNotebook(store.read()), damaged ? 'happy-emotes-recuperacion.json' : 'happy-emotes-cuaderno.json');
      message('Descarga del cuaderno preparada.');
    } catch (error) { report(error); }
  });
  $('notebook-import').addEventListener('click', () => { pause(); $('notebook-file').click(); });
  $('notebook-file').addEventListener('change', async () => {
    const file = $('notebook-file').files[0];
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('El archivo JSON admite hasta 1 MiB.');
      const incoming = decodeNotebook(await file.text());
      let result;
      store.change(current => { result = mergeExperiments(current, incoming, newId); return result.entries; });
      refresh();
      message(`Importación completa: ${result.added} añadidos, ${result.skipped} duplicados omitidos.${store.temporary ? ' Exporta antes de cerrar esta pestaña.' : ''}`);
    } catch (error) { report(error); }
    finally { $('notebook-file').value = ''; }
  });
  $('notebook-form').addEventListener('focusin', pause);
  $('open-notebook').addEventListener('click', () => { pause(); $('experiment-name').focus(); });
  window.addEventListener('storage', event => {
    if (event.key === NOTEBOOK_KEY || event.key === null) refresh();
  });
  refresh();
}
