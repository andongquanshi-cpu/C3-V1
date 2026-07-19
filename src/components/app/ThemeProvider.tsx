"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  APP_PREFERENCES_STORAGE_KEY,
  DEFAULT_APP_PREFERENCES,
  readStoredJson,
  writeStoredJson,
  type AppPreferences,
} from "@/lib/storage";

interface ThemeContextValue extends AppPreferences {
  setTheme: (theme: AppPreferences["theme"]) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppPreferences["theme"]>(DEFAULT_APP_PREFERENCES.theme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredJson(APP_PREFERENCES_STORAGE_KEY, DEFAULT_APP_PREFERENCES);
      setThemeState(stored.theme === "night" ? "night" : "day");
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
    if (ready) {
      writeStoredJson(APP_PREFERENCES_STORAGE_KEY, { theme });
    }
  }, [ready, theme]);

  const setTheme = useCallback((nextTheme: AppPreferences["theme"]) => {
    setThemeState(nextTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme 必须在 ThemeProvider 内使用");
  return context;
}
