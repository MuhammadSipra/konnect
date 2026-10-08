import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './theme';

type ThemeMode = 'light' | 'dark';

const ThemeContext = createContext<{
  mode: ThemeMode;
  colors: ThemeColors;
}>({
  mode: 'light',
  colors: lightColors,
});

// The app always follows the phone's light/dark setting, like WhatsApp.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode: ThemeMode = systemScheme === 'dark' ? 'dark' : 'light';
  const colors = mode === 'dark' ? darkColors : lightColors;

  return <ThemeContext.Provider value={{ mode, colors }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}