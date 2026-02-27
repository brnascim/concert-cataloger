import { useState, useCallback, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'bmg';

const STORAGE_KEY = 'setlist_agent_theme';

function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && ['light', 'dark', 'bmg'].includes(v)) return v as Theme;
  } catch {}
  return 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return { theme, setTheme };
}
