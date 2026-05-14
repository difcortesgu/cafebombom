import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import 'react-native-reanimated';

import { useAppColors, useThemeMode } from '@/hooks/use-theme-color';
import { t } from '@/i18n';

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
        <Stack.Screen name="product-form" options={{ title: t('nav.stack.product') }} />
        <Stack.Screen name="category-form" options={{ title: t('nav.stack.category') }} />
        <Stack.Screen name="ingredient-form" options={{ title: t('nav.stack.ingredient') }} />
        <Stack.Screen name="table-form" options={{ title: t('nav.stack.table') }} />
        <Stack.Screen name="inventory-form" options={{ title: t('nav.stack.inventory') }} />
        <Stack.Screen name="sale-form" options={{ title: t('nav.stack.sale') }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
