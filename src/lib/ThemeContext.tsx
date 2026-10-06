import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './theme';

export type ThemePreference = 'system' | 'light' | 'dark';
type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'domexa_theme_mode';

const ThemeContext = createContext<{
  mode: ThemeMode; // what is actually shown right now
  preference: ThemePreference; // what the user picked in Settings
  colors: ThemeColors;
  setMode: (m: ThemePreference) => void; // kept so older screens keep working
  setPreference: (p: ThemePreference) => void;
}>({
  mode: 'light',
  preference: 'system',
  colors: lightColors,
  setMode: () => {},
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Fresh install follows the phone's light/dark setting until the user picks something.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light' || saved === 'system') setPreferenceState(saved);
      })
      .catch(() => {});
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, preference, colors, setMode: setPreference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}