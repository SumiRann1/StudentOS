import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_PRESETS, defaultThemeKey } from './colors';
import { storage } from '../services/storage';

const STORAGE_THEME_KEY = 'student_os_active_theme';

const ThemeContext = createContext({
  theme: THEME_PRESETS[defaultThemeKey],
  themeKey: defaultThemeKey,
  setThemeKey: () => {},
  themePresets: THEME_PRESETS,
});

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyInternal] = useState(defaultThemeKey);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedKey = await storage.getItem(STORAGE_THEME_KEY);
      if (savedKey && THEME_PRESETS[savedKey]) {
        setThemeKeyInternal(savedKey);
      }
    } catch (e) {
      console.warn('Failed to load saved theme key:', e);
    }
  };

  const setThemeKey = async (key) => {
    if (!THEME_PRESETS[key]) return;
    setThemeKeyInternal(key);
    try {
      await storage.setItem(STORAGE_THEME_KEY, key);
    } catch (e) {
      console.warn('Failed to save theme key:', e);
    }
  };

  const currentTheme = THEME_PRESETS[themeKey] || THEME_PRESETS[defaultThemeKey];

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        colors: currentTheme,
        themeKey,
        setThemeKey,
        themePresets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: THEME_PRESETS[defaultThemeKey],
      colors: THEME_PRESETS[defaultThemeKey],
      themeKey: defaultThemeKey,
      setThemeKey: () => {},
      themePresets: THEME_PRESETS,
    };
  }
  return context;
}
