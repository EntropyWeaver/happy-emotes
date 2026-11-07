const DECOMPOSED_ACCENT = 'a\u0301';

const challenges = {
  grapheme: {
    task: 'Consigue que el espécimen entero sea un solo grafema de exactamente siete puntos de código.',
    hint: 'Busca un emoji formado por cuatro figuras y tres unidores invisibles, o prueba con una letra y seis marcas combinantes.',
    link: ['#specimen', 'Ir al espécimen'],
  },
  accent: {
    task: 'Reduce los puntos de código de «á» y conserva la letra con su acento. Puedes preparar la versión descompuesta aquí.',
    hint: 'Busca Aplicar NFC en el inspector. La «a» y el acento agudo tienen una forma compuesta en Unicode.',
    link: ['#normalize-nfc', 'Ir a normalización'],
  },
  clip: {
    task: 'Haz que la tinta sobresalga por arriba o por abajo de la caja azul de A. Compruébalo y luego recorta el mensaje.',
    hint: 'Prueba La araña con Noto Sans y varias marcas. En la vista A, pon Mensaje en visible y pulsa Comprobar. El segundo paso se hace en ese mismo selector.',
    link: ['#overflow-a', 'Ir al recorte de A'],
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
    result.textContent = message;
  }

  function renderProgress() {
    progress.textContent = `${solved.size} de 3 resueltos`;
    for (const button of buttons) {
      const complete = solved.has(button.dataset.challenge);
      button.querySelector('.challenge-done').hidden = !complete;
    }
  }

  function select(id) {
    active = id;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.challenge === id));
    const challenge = challenges[id];
    task.textContent = challenge.task;
    hint.textContent = challenge.hint;
    hint.hidden = true;
    toggleHint.setAttribute('aria-expanded', 'false');
    prepare.hidden = id !== 'accent';
    link.href = challenge.link[0];
    link.textContent = challenge.link[1];
    check.textContent = solved.has(id) ? 'Repetir reto' : 'Comprobar';
    const previous = solved.get(id);
    showResult(previous ?? (id === 'clip' && overflowCheckpoint ? 'Paso 1 de 2. Ahora elige clip o hidden en Mensaje de A y comprueba de nuevo.' : ''), Boolean(previous));
  }

  function complete(message) {
    solved.set(active, message);
    showResult(message, true);
    check.textContent = 'Repetir reto';
    renderProgress();
  }

  function checkGrapheme() {
    const { clusters, codepoints } = readText();
    if (!clusters) {
      showResult('Este navegador no ofrece segmentación de grafemas.');
    } else if (clusters.length === 1 && codepoints === 7) {
      complete('¡Resuelto! El navegador agrupa los siete puntos de código en un solo grafema. El inspector te deja abrir ese grupo y ver cada pieza.');
    } else {
      showResult(`Ahora hay ${clusters.length} ${clusters.length === 1 ? 'grafema' : 'grafemas'} y ${codepoints} ${codepoints === 1 ? 'punto de código' : 'puntos de código'}. Busca 1 y 7.`);
    }
  }

  function checkAccent() {
    const { text, codepoints } = readText();
    if (text.normalize('NFD') !== DECOMPOSED_ACCENT) {
      showResult('El espécimen debe seguir siendo una sola «á». Usa Preparar acento para empezar con la forma de dos puntos.');
    } else if (codepoints >= 2) {
      showResult('El acento sigue descompuesto en dos puntos de código. Prueba Aplicar NFC en el inspector.');
    } else {
      complete('¡Resuelto! Pasaste de U+0061 + U+0301 a U+00E1. Ambas formas son canónicamente equivalentes. El acento sigue ahí y ahora ocupa un solo punto de código.');
    }
  }

  function checkClip() {
    const ink = readInk();
    if (!ink || !ink.overhang) {
      showResult('La estimación de tinta aún no detecta desbordamiento vertical en la zona visible del panel A. Prueba con la araña, Noto Sans y más marcas.');
      return;
    }
    if (ink.overflow === 'visible') {
      overflowCheckpoint = ink.settings;
      showResult('Paso 1 de 2. La tinta estimada rebasa la caja azul. Elige clip o hidden en Mensaje de A y comprueba de nuevo.');
    } else if (!overflowCheckpoint) {
      showResult('Primero elige visible en Mensaje de A y comprueba el desbordamiento.');
    } else if (ink.settings !== overflowCheckpoint) {
      showResult('Para comparar, conserva el texto, la fuente, el tamaño, la altura de línea y el recorte del panel. Si quieres empezar con otros ajustes, vuelve a comprobar con Mensaje en visible.');
    } else if (['clip', 'hidden'].includes(ink.overflow)) {
      complete('¡Resuelto! La tinta estimada sigue rebasando la caja antes del recorte. El overflow del mensaje oculta esa parte del dibujo y la caja conserva su altura.');
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
    showResult('Acento preparado. Ahora el espécimen tiene dos puntos de código.');
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
}
