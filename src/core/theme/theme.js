export const THEME_STORAGE_KEY = 'pido-dashboard-theme';

/** @returns {'light' | 'dark'} */
export function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'light';
}

/** @param {'light' | 'dark'} mode */
export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

/** @param {'light' | 'dark'} mode */
export function setTheme(mode) {
  const next = mode === 'dark' ? 'dark' : 'light';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(next);
}

export function initThemeFromStorage() {
  applyTheme(getStoredTheme());
}
