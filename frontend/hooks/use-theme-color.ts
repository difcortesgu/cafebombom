/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { getThemeColors, type ThemeColorName, type ThemeMode } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/stores/settings';

export function useThemeMode(): ThemeMode {
  const colorScheme = useColorScheme();
  const themeModePreference = useSettingsStore((state) => state.themeModePreference);
  if (themeModePreference === 'light') return 'light';
  if (themeModePreference === 'dark') return 'dark';
  return colorScheme === 'dark' ? 'dark' : 'light';
}

export function useAppColors() {
  const mode = useThemeMode();
  const selectedThemeId = useSettingsStore((state) => state.selectedThemeId);
  return getThemeColors(selectedThemeId, mode);
}

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName
) {
  const mode = useThemeMode();
  const colors = useAppColors();
  const colorFromProps = props[mode];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[colorName];
  }
}
