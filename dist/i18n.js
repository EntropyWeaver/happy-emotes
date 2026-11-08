import { staticSpanish } from './static-es.js';

const storageKey = 'happy-emotes:language';
const listeners = new Set();
const messages = new Map();
let current = 'en';
if (typeof window !== 'undefined') {
  try {
    if (window.localStorage.getItem(storageKey) === 'es') current = 'es';
  } catch {
    // Switching still works when browser storage is blocked.
  }
}

export const language = () => current;
export const t = (english, spanish) => current === 'es' ? spanish : english;
export function onLanguageChange(callback) {
  listeners.add(callback);
}

export function setMessage(node, message) {
  if (typeof message === 'function') {
    messages.set(node, message);
    node.textContent = message();
  } else {
    messages.delete(node);
    node.textContent = message;
  }
}

export function initLanguageSelector() {
  const selector = document.getElementById('language');
  const bindings = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  // Only bind authored text, before the app adds any specimen or saved data.
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const english = node.data.trim();
    if (!Object.hasOwn(staticSpanish, english)) continue;
    const text = node;
    const original = node.data;
    bindings.push(() => {
      if (text.isConnected) text.data = original.replace(english, () => t(english, staticSpanish[english]));
    });
  }
  for (const element of document.querySelectorAll('[aria-label], [title], [placeholder], meta[name="description"], optgroup[label]')) {
    for (const attr of ['aria-label', 'title', 'placeholder', 'content', 'label']) {
      const english = element.getAttribute(attr);
      if (Object.hasOwn(staticSpanish, english)) {
        bindings.push(() => element.setAttribute(attr, t(english, staticSpanish[english])));
      }
    }
  }

  function apply() {
    document.documentElement.lang = current;
    selector.value = current;
    for (const update of bindings) update();
    for (const listener of listeners) listener();
    for (const [node, render] of messages) node.textContent = render();
  }

  apply();
  selector.addEventListener('change', () => {
    current = selector.value === 'es' ? 'es' : 'en';
    try { window.localStorage.setItem(storageKey, current); } catch { /* keep this tab's preference */ }
    apply();
  });
}
