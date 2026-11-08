import { setMessage, t } from './i18n.js';
const MAX_FONT_BYTES = 10 * 1024 * 1024;
const MAX_FONTS = 8;
const FORMAT = /\.(woff2?|ttf|otf)$/iu;

async function fontId(bytes) {
  const digest = globalThis.crypto.subtle
    ? new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))
    : globalThis.crypto.getRandomValues(new Uint8Array(32));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

function isFileDrag(event) {
  return event.dataTransfer?.types.includes('Files');
}

export function initLocalFonts({ onChange }) {
  const get = id => document.getElementById(id);
  const zone = get('local-fonts');
  const fileInput = get('local-font-file');
  const picker = get('local-font-pick');
  const target = get('local-font-target');
  const clear = get('local-font-clear');
  const status = get('local-font-status');
  const views = { a: get('font-a'), b: get('font-b') };
  const groups = { a: get('local-fonts-a'), b: get('local-fonts-b') };
  const faces = new Map();
  let busy = false;

  function updateControls() {
    picker.disabled = busy;
    target.disabled = busy;
    clear.hidden = faces.size === 0;
    clear.disabled = busy;
    zone.setAttribute('aria-busy', String(busy));
  }

  async function load(files) {
    if (busy || !files.length) return;
    const [file] = files;
    if (files.length > 1 || !FORMAT.test(file.name)) {
      setMessage(status, () => t("Choose a single WOFF2, WOFF, TTF, or OTF file.", "Elige un solo archivo WOFF2, WOFF, TTF u OTF."));
      return;
    }
    if (!file.size || file.size > MAX_FONT_BYTES) {
      setMessage(status, () => t("The font must be between 1 byte and 10 MiB.", "La fuente debe pesar entre 1 byte y 10 MiB."));
      return;
    }
    const view = target.value;
    busy = true;
    updateControls();
    setMessage(status, () => t("Reading font…", "Leyendo la fuente…"));
    try {
      const bytes = await file.arrayBuffer();
      const id = await fontId(bytes);
      let font = faces.get(id);
      if (!font) {
        if (faces.size >= MAX_FONTS) {
          setMessage(status, () => t("You already have 8 local fonts. Remove them to load more.", "Ya hay 8 fuentes locales. Quítalas para cargar más."));
          return;
        }
        const family = `LabLocal-${id}`;
        const face = await new FontFace(family, bytes).load();
        document.fonts.add(face);
        font = { family, face, name: file.name };
        faces.set(id, font);
        for (const group of Object.values(groups)) {
          group.append(new Option(font.name, id));
          group.hidden = false;
        }
      }
      views[view].value = id;
      onChange();
      setMessage(status, () => t(`${font.name} applied to view ${view.toUpperCase()}. You can also select it in the other Font menu.`, `${font.name} aplicada a la vista ${view.toUpperCase()}. Puedes elegirla también en el otro selector de Fuente.`));
    } catch {
      setMessage(status, () => t("The browser could not read the font. Try another supported file.", "El navegador no pudo leer la fuente. Prueba con otro archivo compatible."));
    } finally {
      busy = false;
      updateControls();
    }
  }

  picker.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    fileInput.value = '';
    load(files);
  });
  zone.addEventListener('dragover', event => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
    zone.classList.toggle('font-dragging', !busy);
  });
  zone.addEventListener('dragleave', event => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('font-dragging');
  });
  zone.addEventListener('drop', event => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    zone.classList.remove('font-dragging');
    load(Array.from(event.dataTransfer.files));
  });
  clear.addEventListener('click', () => {
    for (const { face } of faces.values()) document.fonts.delete(face);
    for (const view of Object.keys(views)) {
      if (faces.has(views[view].value)) views[view].value = 'noto';
      groups[view].replaceChildren();
      groups[view].hidden = true;
    }
    faces.clear();
    onChange();
    picker.focus();
    updateControls();
    setMessage(status, () => t("Local fonts removed.", "Fuentes locales retiradas."));
  });

  return {
    has: id => faces.has(id),
    family: id => faces.has(id) ? `"${faces.get(id).family}", sans-serif` : null,
    warnMissing: missing => {
      setMessage(status, () => missing.length
        ? t(`View ${missing.join(t(" and view ", " y la vista "))} uses a fallback font. Load the original file to restore its typography.`, `La vista ${missing.join(t(" and view ", " y la vista "))} usa una fuente de sustitución. Carga el archivo original para recuperar su tipografía.`)
        : '');
    },
  };
}
