import { t } from './i18n.js';
/** Pure text analysis. No font metrics or DOM assumptions belong here. */
export const MAX_CODEPOINTS = 512;
export const MAX_MARKS = 60;

export const PRESETS = {
  spider: { get label() { return t("The spider", "La araña"); }, text: '╲(◕ o' + '\u034B'.repeat(12) + ' ◕)╱', get hint() { return t("One base, many marks. Change the font and see how far the thread reaches.", "Una base, muchas marcas. Cambia la fuente y mira hasta dónde llega el hilo."); } },
  accent: { get label() { return t("Accents", "Acentos"); }, text: '\u00E1 a\u0301', get hint() { return t("They look alike. “á” has one code point and “a + ◌́” has two. Each forms one grapheme.", "Parecen iguales: «á» tiene 1 punto de código; «a + ◌́» tiene 2. Cada una forma un grafema."); } },
  family: { get label() { return t("Family", "Familia"); }, text: '👨‍👩‍👧‍👦', get hint() { return t("Four people and three zero-width joiners make seven code points in one grapheme.", "Cuatro personas y tres unidores ZWJ: 7 puntos de código dentro de un único grafema."); } },
  flags: { get label() { return t("Flags", "Banderas"); }, text: '🇪🇸 🇯🇵', get hint() { return t("Each flag combines two regional indicators. The font determines how they are drawn.", "Cada bandera combina dos indicadores regionales. La fuente decide cómo se dibujan."); } },
  skin: { get label() { return t("Skin tone", "Tono de piel"); }, text: '👋🏽', get hint() { return t("An emoji and a skin tone modifier form one grapheme.", "Un emoji y un modificador de tono de piel se agrupan en un grafema."); } },
  scripts: { get label() { return t("Scripts", "Escrituras"); }, text: 'नमस्ते · مَرْحَبًا', get hint() { return t("Combining marks are part of everyday writing systems.", "Las marcas combinantes también forman parte de escrituras cotidianas. No son un error."); } }
};

export function makeSpider(count = 12, mark = '\u034B') {
  const n = Math.max(0, Math.min(MAX_MARKS, Math.trunc(Number(count) || 0)));
  const safeMark = ['\u034B', '\u0301', '\u0323', '\uFC5E'].includes(mark) ? mark : '\u034B';
  return '╲(◕ o' + safeMark.repeat(n) + ' ◕)╱';
}

export function limitText(text, max = MAX_CODEPOINTS) {
  const points = Array.from(String(text));
  return { text: points.slice(0, max).join(''), truncated: points.length > max };
}

export function codepointLabel(char) {
  return 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
}

export function escapedText(text) {
  return Array.from(text, char => {
    const cp = char.codePointAt(0);
    return cp <= 0xffff ? '\\u' + cp.toString(16).toUpperCase().padStart(4, '0') : '\\u{' + cp.toString(16).toUpperCase() + '}';
  }).join('');
}

export function categoryOf(char) {
  if (/\p{Mn}/u.test(char)) return { code: 'Mn', label: t("Nonspacing mark", "Marca sin espaciado") };
  if (/\p{Mc}/u.test(char)) return { code: 'Mc', label: t("Spacing mark", "Marca con espaciado") };
  if (/\p{Me}/u.test(char)) return { code: 'Me', label: t("Enclosing mark", "Marca envolvente") };
  if (/\p{Cf}/u.test(char)) return { code: 'Cf', label: t("Format / joiner", "Formato / unión") };
  if (/\p{Cc}/u.test(char)) return { code: 'Cc', label: t("Control", "Control") };
  if (/\p{Z}/u.test(char)) return { code: 'Z', label: t("Separator", "Separador") };
  if (/\p{L}/u.test(char)) return { code: 'L', label: t("Letter", "Letra") };
  if (/\p{N}/u.test(char)) return { code: 'N', label: t("Number", "Número") };
  if (/\p{P}/u.test(char)) return { code: 'P', label: t("Punctuation", "Puntuación") };
  if (/\p{S}/u.test(char)) return { code: 'S', label: t("Symbol", "Símbolo") };
  return { code: 'C', label: t("Other / unassigned", "Otro / no asignado") };
}

export function displayChar(char) {
  if (char === ' ') return '␠';
  if (char === '\n') return '↵';
  if (char === '\r') return 'CR';
  if (char === '\t') return '⇥';
  if (char === '\u200D') return 'ZWJ';
  if (char === '\u200C') return 'ZWNJ';
  if (char === '\uFE0F') return 'VS16';
  if (char === '\uFE0E') return 'VS15';
  if (/[\p{Cc}\p{Cf}\p{Z}]/u.test(char)) return codepointLabel(char);
  return /\p{M}/u.test(char) ? '◌' + char : char;
}

export function analyzeText(text, Segmenter = globalThis.Intl?.Segmenter) {
  const clusters = typeof Segmenter === 'function'
    ? Array.from(new Segmenter('es', { granularity: 'grapheme' }).segment(text), item => ({ text: item.segment, start: item.index, end: item.index + item.segment.length }))
    : null;
  let offset = 0;
  const points = Array.from(text, char => {
    const start = offset;
    offset += char.length;
    return { char, code: codepointLabel(char), offset: start, end: offset, category: categoryOf(char), cluster: clusters?.findIndex(c => start >= c.start && start < c.end) ?? null };
  });
  return {
    text, points, clusters,
    codepoints: points.length,
    utf16: text.length,
    utf8: new TextEncoder().encode(text).length,
    marks: points.filter(p => /\p{M}/u.test(p.char)).length
  };
}

export function canvasEligible(text) {
  // Canvas is a separate shaping path, never a measurement of DOM ink.
  return text.length > 0 && !/[\r\n\t\p{Cc}\p{Cf}]/u.test(text.replace(/\u200D/g, ''));
}
