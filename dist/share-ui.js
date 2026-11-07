import { createExperimentURL, decodeExperimentHash } from './share.js';

const $ = id => document.getElementById(id);

export function initShareLinks({ capture, restore }) {
  let copyGeneration = 0;
  $('share-experiment').addEventListener('click', () => {
    try {
      const snapshot = capture();
      const url = createExperimentURL(window.location.href, snapshot);
      $('share-font-note').hidden = !Object.values(snapshot.views).some(view => view.localFont);
      copyGeneration++;
      $('share-url').value = url;
      $('share-copy').disabled = false;
      $('share-open').href = url;
      $('share-panel').hidden = false;
      $('share-experiment').setAttribute('aria-expanded', 'true');
      $('share-status').textContent = 'Enlace generado. Ya puedes copiarlo o probarlo.';
      $('share-url').focus();
      $('share-url').select();
    } catch (error) {
      $('share-font-note').hidden = true;
      $('share-url').value = '';
      $('share-copy').disabled = true;
      $('share-open').removeAttribute('href');
      $('share-panel').hidden = false;
      $('share-experiment').setAttribute('aria-expanded', 'true');
      $('share-status').textContent = error.message;
    }
  });

  $('share-copy').addEventListener('click', async () => {
    const generation = copyGeneration;
    const value = $('share-url').value;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (generation === copyGeneration) $('share-status').textContent = 'Enlace copiado. Quien lo abra recuperará este experimento en pausa.';
    } catch {
      if (generation !== copyGeneration) return;
      $('share-url').focus();
      $('share-url').select();
      $('share-status').textContent = 'Enlace seleccionado. Usa Ctrl+C o ⌘C para copiarlo.';
    }
  });

  $('share-close').addEventListener('click', () => {
    copyGeneration++;
    $('share-panel').hidden = true;
    $('share-experiment').setAttribute('aria-expanded', 'false');
    $('share-experiment').focus();
  });

  function openFromHash() {
    try {
      const snapshot = decodeExperimentHash(window.location.hash);
      if (!snapshot) return;
      const missingFonts = restore(snapshot);
      $('shared-notice').hidden = false;
      $('shared-notice').classList.remove('share-error');
      $('shared-notice-text').textContent = missingFonts.length
        ? `Experimento abierto en pausa. Se usan fuentes de sustitución en ${missingFonts.join(' y ')}. Puedes cargar los archivos originales en Fuentes locales.`
        : 'Experimento abierto desde un enlace, en pausa. El dibujo puede variar con el navegador y las fuentes disponibles.';
      requestAnimationFrame(() => $('shared-notice').scrollIntoView({ block: 'start' }));
    } catch (error) {
      $('shared-notice').hidden = false;
      $('shared-notice').classList.add('share-error');
      $('shared-notice-text').textContent = `No se ha podido abrir el experimento: ${error.message} Puedes seguir usando el laboratorio.`;
      requestAnimationFrame(() => $('shared-notice').scrollIntoView({ block: 'start' }));
    }
  }
  $('shared-notice-close').addEventListener('click', () => {
    $('shared-notice').hidden = true;
    $('render-title').focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
}
