import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import 'react-native-reanimated';

import { useAppColors, useThemeMode } from '@/hooks/use-theme-color';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const mode = useThemeMode();
  const palette = useAppColors();

  const navigationTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.tint,
        background: palette.background,
        card: palette.card,
        text: palette.text,
        border: palette.border,
        notification: palette.accent,
      },
    };
  }, [mode, palette]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product-form" options={{ title: 'Product' }} />
        <Stack.Screen name="ingredient-form" options={{ title: 'Ingredient' }} />
        <Stack.Screen name="table-form" options={{ title: 'Table' }} />
        <Stack.Screen name="inventory-form" options={{ title: 'Inventory' }} />
        <Stack.Screen name="accounts-form" options={{ title: 'Accounts' }} />
        <Stack.Screen name="sale-form" options={{ title: 'Sale' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
