import { language, onLanguageChange, setMessage, t } from './i18n.js';
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
      setMessage($('share-status'), () => t("Link ready to copy or test.", "Enlace generado. Ya puedes copiarlo o probarlo."));
      $('share-url').focus();
      $('share-url').select();
    } catch (error) {
      $('share-font-note').hidden = true;
      $('share-url').value = '';
      $('share-copy').disabled = true;
      $('share-open').removeAttribute('href');
      $('share-panel').hidden = false;
      $('share-experiment').setAttribute('aria-expanded', 'true');
      setMessage($('share-status'), error.message);
    }
  });

  $('share-copy').addEventListener('click', async () => {
    const generation = copyGeneration;
    const value = $('share-url').value;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (generation === copyGeneration) setMessage($('share-status'), () => t("Link copied. Recipients will open this experiment in a paused state.", "Enlace copiado. Quien lo abra recuperará este experimento en pausa."));
    } catch {
      if (generation !== copyGeneration) return;
      $('share-url').focus();
      $('share-url').select();
      setMessage($('share-status'), () => t("Link selected. Use Ctrl+C or ⌘C to copy.", "Enlace seleccionado. Usa Ctrl+C o ⌘C para copiarlo."));
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
      setMessage($('shared-notice-text'), () => missingFonts.length
        ? t(`Experiment opened and paused. Using fallback fonts in ${missingFonts.join(t(' and ', ' y '))}. You can load the original files in Local fonts.`, `Experimento abierto en pausa. Se usan fuentes de sustitución en ${missingFonts.join(t(' and ', ' y '))}. Puedes cargar los archivos originales en Fuentes locales.`)
        : t("Experiment opened from a link and paused. Rendering can vary with the browser and available fonts.", "Experimento abierto desde un enlace, en pausa. El dibujo puede variar con el navegador y las fuentes disponibles."));
      requestAnimationFrame(() => $('shared-notice').scrollIntoView({ block: 'start' }));
    } catch (error) {
      $('shared-notice').hidden = false;
      $('shared-notice').classList.add('share-error');
      const errorLanguage = language();
      setMessage($('shared-notice-text'), () => errorLanguage === language()
        ? t(`Could not open the experiment: ${error.message} You can still use the lab.`, `No se ha podido abrir el experimento: ${error.message} Puedes seguir usando el laboratorio.`)
        : t("Could not open the shared experiment. You can still use the lab.", "No se ha podido abrir el experimento compartido. Puedes seguir usando el laboratorio."));
      requestAnimationFrame(() => $('shared-notice').scrollIntoView({ block: 'start' }));
    }
  }
  $('shared-notice-close').addEventListener('click', () => {
    $('shared-notice').hidden = true;
    $('render-title').focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
  onLanguageChange(() => { $('share-status').textContent = ''; });
}
