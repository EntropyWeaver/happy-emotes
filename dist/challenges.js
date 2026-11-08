import { onLanguageChange, setMessage, t } from './i18n.js';
const DECOMPOSED_ACCENT = 'a\u0301';

const challenges = {
  grapheme: {
    get task() { return t("Make the entire specimen one grapheme with exactly seven code points.", "Consigue que el espécimen entero sea un solo grafema de exactamente siete puntos de código."); },
    get hint() { return t("Look for an emoji made of four figures and three invisible joiners, or try a letter with six combining marks.", "Busca un emoji formado por cuatro figuras y tres unidores invisibles, o prueba con una letra y seis marcas combinantes."); },
    get link() { return ['#specimen', t("Go to specimen", "Ir al espécimen")]; },
  },
  accent: {
    get task() { return t("Reduce the code point count of “á” while keeping its accent. You can set up the decomposed form here.", "Reduce los puntos de código de «á» y conserva la letra con su acento. Puedes preparar la versión descompuesta aquí."); },
    get hint() { return t("Find Apply NFC in the inspector. Unicode has a composed form for the letter “a” with an acute accent.", "Busca Aplicar NFC en el inspector. La «a» y el acento agudo tienen una forma compuesta en Unicode."); },
    get link() { return ['#normalize-nfc', t("Go to normalization", "Ir a normalización")]; },
  },
  clip: {
    get task() { return t("Make the ink extend above or below the blue box in A. Check it, then clip the message.", "Haz que la tinta sobresalga por arriba o por abajo de la caja azul de A. Compruébalo y luego recorta el mensaje."); },
    get hint() { return t("Try The spider with Noto Sans and several marks. In view A, set Message to visible and click Check. Use the same selector for step two.", "Prueba La araña con Noto Sans y varias marcas. En la vista A, pon Mensaje en visible y pulsa Comprobar. El segundo paso se hace en ese mismo selector."); },
    get link() { return ['#overflow-a', t("Go to view A clipping", "Ir al recorte de A")]; },
  },
};

export function initChallenges({ readText, readInk, prepareAccent }) {
  const get = id => document.getElementById(id);
  const buttons = [...get('challenge-options').querySelectorAll('button')];
  const task = get('challenge-task');
  const hint = get('challenge-hint');
  const toggleHint = get('challenge-hint-toggle');
  const prepare = get('challenge-prepare');
  const link = get('challenge-link');
  const check = get('challenge-check');
  const result = get('challenge-result');
  const progress = get('challenge-progress');
  const solved = new Map();
  let active = 'grapheme';
  let overflowCheckpoint = null;

  function showResult(message, success = false) {
    result.dataset.success = String(success);
    setMessage(result, message);
  }

  function renderProgress() {
    progress.textContent = t(`${solved.size} of 3 solved`, `${solved.size} de 3 resueltos`);
    for (const button of buttons) {
      const complete = solved.has(button.dataset.challenge);
      button.querySelector('.challenge-done').hidden = !complete;
    }
  }

  function renderLabels() {
    const challenge = challenges[active];
    task.textContent = challenge.task;
    hint.textContent = challenge.hint;
    prepare.hidden = active !== 'accent';
    const [href, label] = challenge.link;
    link.href = href;
    link.textContent = label;
    check.textContent = solved.has(active) ? t("Try again", "Repetir reto") : t("Check", "Comprobar");
  }

  function select(id) {
    active = id;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.challenge === id));
    hint.hidden = true;
    toggleHint.setAttribute('aria-expanded', 'false');
    renderLabels();
    const previous = solved.get(id);
    showResult(previous ?? (id === 'clip' && overflowCheckpoint ? () => t("Step 1 of 2. Now set Message in view A to clip or hidden and check again.", "Paso 1 de 2. Ahora elige clip o hidden en Mensaje de A y comprueba de nuevo.") : ''), Boolean(previous));
  }

  function complete(message) {
    solved.set(active, message);
    showResult(message, true);
    check.textContent = t("Try again", "Repetir reto");
    renderProgress();
  }

  function checkGrapheme() {
    const { clusters, codepoints } = readText();
    if (!clusters) {
      showResult(() => t("This browser does not support grapheme segmentation.", "Este navegador no ofrece segmentación de grafemas."));
    } else if (clusters.length === 1 && codepoints === 7) {
      complete(() => t("Solved! The browser groups all seven code points into one grapheme. Open the inspector to see each piece.", "¡Resuelto! El navegador agrupa los siete puntos de código en un solo grafema. El inspector te deja abrir ese grupo y ver cada pieza."));
    } else {
      showResult(() => {
        const grapheme = clusters.length === 1 ? t("grapheme", "grafema") : t("graphemes", "grafemas");
        const point = codepoints === 1 ? t("code point", "punto de código") : t("code points", "puntos de código");
        return t(`You have ${clusters.length} ${grapheme} and ${codepoints} ${point}. Aim for 1 and 7.`,
          `Ahora hay ${clusters.length} ${grapheme} y ${codepoints} ${point}. Busca 1 y 7.`);
      });
    }
  }

  function checkAccent() {
    const { text, codepoints } = readText();
    if (text.normalize('NFD') !== DECOMPOSED_ACCENT) {
      showResult(() => t("Keep a single “á” as the specimen. Use Set up accent to start with the two-code-point form.", "El espécimen debe seguir siendo una sola «á». Usa Preparar acento para empezar con la forma de dos puntos."));
    } else if (codepoints >= 2) {
      showResult(() => t("The accent is still decomposed into two code points. Try Apply NFC in the inspector.", "El acento sigue descompuesto en dos puntos de código. Prueba Aplicar NFC en el inspector."));
    } else {
      complete(() => t("Solved! U+0061 + U+0301 became U+00E1. Both forms are canonically equivalent. The accent remains and the result uses one code point.", "¡Resuelto! Pasaste de U+0061 + U+0301 a U+00E1. Ambas formas son canónicamente equivalentes. El acento sigue ahí y ahora ocupa un solo punto de código."));
    }
  }

  function checkClip() {
    const ink = readInk();
    if (!ink || !ink.overhang) {
      showResult(() => t("The ink estimate has yet to show vertical overflow within the visible area of view A. Try the spider, Noto Sans, and more marks.", "La estimación de tinta aún no detecta desbordamiento vertical en la zona visible del panel A. Prueba con la araña, Noto Sans y más marcas."));
      return;
    }
    if (ink.overflow === 'visible') {
      overflowCheckpoint = ink.settings;
      showResult(() => t("Step 1 of 2. The estimated ink extends past the blue box. Set Message in view A to clip or hidden and check again.", "Paso 1 de 2. La tinta estimada rebasa la caja azul. Elige clip o hidden en Mensaje de A y comprueba de nuevo."));
    } else if (!overflowCheckpoint) {
      showResult(() => t("First set Message in view A to visible and check for overflow.", "Primero elige visible en Mensaje de A y comprueba el desbordamiento."));
    } else if (ink.settings !== overflowCheckpoint) {
      showResult(() => t("Keep the text, font, size, line height, and panel clipping the same. To start with different settings, check again with Message set to visible.", "Para comparar, conserva el texto, la fuente, el tamaño, la altura de línea y el recorte del panel. Si quieres empezar con otros ajustes, vuelve a comprobar con Mensaje en visible."));
    } else if (['clip', 'hidden'].includes(ink.overflow)) {
      complete(() => t("Solved! The estimated ink still extends past the box before clipping. The message’s overflow setting hides that part of the drawing while the box keeps its height.", "¡Resuelto! La tinta estimada sigue rebasando la caja antes del recorte. El overflow del mensaje oculta esa parte del dibujo y la caja conserva su altura."));
    }
  }

  for (const button of buttons) button.addEventListener('click', () => select(button.dataset.challenge));
  toggleHint.addEventListener('click', () => {
    hint.hidden = !hint.hidden;
    toggleHint.setAttribute('aria-expanded', String(!hint.hidden));
  });
  prepare.addEventListener('click', () => {
    prepareAccent(DECOMPOSED_ACCENT);
    solved.delete('accent');
    renderProgress();
    select('accent');
    showResult(() => t("Accent set up. The specimen now has two code points.", "Acento preparado. Ahora el espécimen tiene dos puntos de código."));
  });
  check.addEventListener('click', () => {
    if (solved.delete(active)) {
      if (active === 'clip') overflowCheckpoint = null;
      renderProgress();
      select(active);
      return;
    }
    if (active === 'grapheme') checkGrapheme();
    if (active === 'accent') checkAccent();
    if (active === 'clip') checkClip();
  });
  select(active);
  onLanguageChange(() => { renderLabels(); renderProgress(); });
}
