import { onLanguageChange, setMessage, t } from './i18n.js';
import { categoryOf, codepointLabel, displayChar, limitText, MAX_CODEPOINTS } from './core.js';

const palette = {
  above: [0x0301, 0x0302, 0x0303, 0x0308, 0x030A, 0x034B],
  below: [0x0316, 0x0323, 0x0324, 0x0327, 0x0329, 0x0332],
  overlay: [0x0334, 0x0336, 0x0337, 0x0338, 0x20DD, 0x20DE],
  join: [0x200D, 0x200C, 0xFE0E, 0xFE0F],
  emoji: [0x1F3FB, 0x1F3FC, 0x1F3FD, 0x1F3FE, 0x1F3FF],
};

const categoryLabels = {
  get Mn() { return t("Nonspacing mark", "Marca sin espaciado"); },
  get Me() { return t("Enclosing mark", "Marca envolvente"); },
  get Cf() { return t("Format character", "Carácter de formato"); },
  get Sk() { return t("Modifier symbol", "Símbolo modificador"); },
};

export function initCreatureBuilder({ getText, setText, getRecord }) {
  const byId = id => document.getElementById(id);
  const builder = byId('criaturas');
  const base = byId('creature-base');
  const group = byId('creature-group');
  const pieces = byId('creature-pieces');
  const name = byId('creature-piece-name');
  const category = byId('creature-piece-category');
  const status = byId('creature-status');
  let described;

  function describe(char) {
    described = char;
    const record = getRecord(char);
    const fallback = categoryOf(char);
    const code = record?.[1] ?? fallback.code;
    name.textContent = `${codepointLabel(char)} · ${record?.[0] ?? t("Name pending from the catalog", "Nombre pendiente del catálogo")}`;
    category.textContent = `${code} · ${categoryLabels[code] ?? fallback.label}`;
    if (record && code.startsWith('M')) category.textContent += t(` · Combining class ${record[2]}`, ` · Clase combinante ${record[2]}`);
  }

  function append(char) {
    const result = limitText(getText() + char);
    if (result.truncated) {
      setMessage(status, () => t(`You reached the ${MAX_CODEPOINTS} code point limit. Remove a piece to add another.`, `Has alcanzado el límite de ${MAX_CODEPOINTS} puntos de código. Quita una pieza para añadir otra.`));
      return;
    }
    setText(result.text);
    setMessage(status, () => t(`Added ${codepointLabel(char)} · ${Array.from(result.text).length} code points total.`, `Añadido ${codepointLabel(char)} · ${Array.from(result.text).length} puntos de código en total.`));
  }

  function renderPalette() {
    const chars = palette[group.value].map(point => String.fromCodePoint(point));
    const buttons = chars.map(char => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'creature-piece';
      const glyph = document.createElement('span');
      glyph.className = 'creature-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = group.value === 'emoji' ? '👍' + char : displayChar(char);
      const code = document.createElement('small');
      code.textContent = codepointLabel(char);
      button.append(glyph, code);
      button.setAttribute('aria-label', t(`Add ${codepointLabel(char)}`, `Añadir ${codepointLabel(char)}`));
      button.setAttribute('aria-describedby', 'creature-piece-name creature-piece-category');
      button.addEventListener('pointerenter', () => describe(char));
      button.addEventListener('focus', () => describe(char));
      button.addEventListener('click', () => {
        describe(char);
        append(char);
      });
      return button;
    });
    pieces.replaceChildren(...buttons);
    describe(chars[0]);
  }

  byId('creature-use-base').addEventListener('click', () => {
    const char = base.value;
    setText(char);
    setMessage(status, () => t(`Base applied · ${codepointLabel(char)}.`, `Base aplicada · ${codepointLabel(char)}.`));
  });
  byId('creature-add-base').addEventListener('click', () => append(base.value));
  byId('creature-remove').addEventListener('click', () => {
    const points = Array.from(getText());
    const removed = points.pop();
    if (removed === undefined) {
      setMessage(status, () => t("The specimen is empty.", "El espécimen está vacío."));
      return;
    }
    setText(points.join(''));
    setMessage(status, () => t(`Removed ${codepointLabel(removed)}.`, `Retirado ${codepointLabel(removed)}.`));
  });
  group.addEventListener('change', renderPalette);

  function openAtAnchor() {
    if (window.location.hash === '#criaturas') builder.open = true;
  }
  document.querySelectorAll('a[href="#criaturas"]').forEach(link => {
    link.addEventListener('click', () => { builder.open = true; });
  });
  window.addEventListener('hashchange', openAtAnchor);
  openAtAnchor();
  renderPalette();
  onLanguageChange(() => {
    const previous = described;
    renderPalette();
    describe(previous);
  });
  return () => describe(described);
}
