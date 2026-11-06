// Runs before the body is painted, so a saved dark theme does not flash white.
(() => {
  const storageKey = 'happy-emotes:theme';
  const modes = new Set(['light', 'dark', 'system']);
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'light';
  let selector;

  try {
    const saved = localStorage.getItem(storageKey);
    if (modes.has(saved)) preference = saved;
  } catch {
    // The selector still works when browser storage is blocked.
  }

  function applyTheme() {
    const resolved = preference === 'system'
      ? (systemTheme.matches ? 'dark' : 'light')
      : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#121019' : '#f7f7fb';
    if (selector) selector.value = preference;
  }

  applyTheme();

  document.addEventListener('DOMContentLoaded', () => {
    selector = document.getElementById('theme');
    if (!selector) return;
    selector.value = preference;
    selector.addEventListener('change', () => {
      preference = modes.has(selector.value) ? selector.value : 'light';
      applyTheme();
      try {
        localStorage.setItem(storageKey, preference);
      } catch {
        // Keep the chosen appearance for this page even without persistence.
      }
    });
  }, { once: true });

  systemTheme.addEventListener('change', () => {
    if (preference === 'system') applyTheme();
  });

  // Keep open tabs in sync; clearing the preference restores the original look.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = modes.has(event.newValue) ? event.newValue : 'light';
    applyTheme();
  });
})();
