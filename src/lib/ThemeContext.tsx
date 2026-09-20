import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { darkColors, lightColors, ThemeColors } from './theme';

type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'konnect_theme_mode';

const ThemeContext = createContext<{
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (m: ThemeMode) => void;
}>({
  mode: 'light',
  colors: lightColors,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Fresh install always starts in light mode — dark is opt-in via Settings.
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') setModeState(saved);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const colors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}