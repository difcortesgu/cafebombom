/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  text: string;
  mutedText: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  card: string;
  border: string;
  inputBackground: string;
  placeholder: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
};

export type AppThemeDefinition = {
  id: string;
  name: string;
  description: string;
  preview: [string, string, string, string];
  colors: Record<ThemeMode, ThemeColors>;
};

export const APP_THEMES = [
  {
    id: 'cafe-classic',
    name: 'Cafe Classic',
    description: 'Warm caramel and espresso tones for a cozy POS look.',
    preview: ['#B64D1A', '#E87D2F', '#C5AA90', '#2E251F'],
    colors: {
      light: {
        text: '#1D130D',
        mutedText: '#5A4738',
        background: '#FFFCF8',
        tint: '#B64D1A',
        icon: '#4E4035',
        tabIconDefault: '#4E4035',
        tabIconSelected: '#B64D1A',
        card: '#FFFFFF',
        border: '#BFA792',
        inputBackground: '#FFFFFF',
        placeholder: '#6D5B4D',
        accent: '#E87D2F',
        success: '#2D8A4E',
        warning: '#B25A12',
        danger: '#B93A2E',
      },
      dark: {
        text: '#F7F2EC',
        mutedText: '#D8C8B8',
        background: '#17120F',
        tint: '#F8C08A',
        icon: '#E0D3C5',
        tabIconDefault: '#CABDAF',
        tabIconSelected: '#F8C08A',
        card: '#241D18',
        border: '#6A5545',
        inputBackground: '#2E251F',
        placeholder: '#BCA996',
        accent: '#F39B55',
        success: '#62B37C',
        warning: '#E6A35C',
        danger: '#EC7A6F',
      },
    },
  },
  {
    id: 'quiet-luxury',
    name: 'Quiet Luxury',
    description: 'Soft champagne, blush, and taupe tones with calm contrast.',
    preview: ['#F7E6CA', '#E8D59E', '#D9BBB0', '#AD9C8E'],
    colors: {
      light: {
        text: '#3A312D',
        mutedText: '#73645A',
        background: '#FBF8F3',
        tint: '#AD9C8E',
        icon: '#5C4F47',
        tabIconDefault: '#7D6E64',
        tabIconSelected: '#AD9C8E',
        card: '#FFFFFF',
        border: '#D9BBB0',
        inputBackground: '#FFFFFF',
        placeholder: '#9A8A7E',
        accent: '#E8D59E',
        success: '#6A8A69',
        warning: '#B78C5A',
        danger: '#B87373',
      },
      dark: {
        text: '#EFE6DE',
        mutedText: '#C9B9AE',
        background: '#201A17',
        tint: '#E8D59E',
        icon: '#DECFC5',
        tabIconDefault: '#BDAEA3',
        tabIconSelected: '#E8D59E',
        card: '#2B2420',
        border: '#7E6E64',
        inputBackground: '#332B26',
        placeholder: '#B8A99F',
        accent: '#D9BBB0',
        success: '#88A487',
        warning: '#D2AC7B',
        danger: '#D19595',
      },
    },
  },
  {
    id: 'evergreen-ledger',
    name: 'Evergreen Ledger',
    description: 'Earthy green and cream palette with crisp readability.',
    preview: ['#E7F0E3', '#B8CDA7', '#7D9A73', '#3F5A4B'],
    colors: {
      light: {
        text: '#213029',
        mutedText: '#4C6357',
        background: '#F7FBF5',
        tint: '#4C735D',
        icon: '#3D5A4B',
        tabIconDefault: '#527061',
        tabIconSelected: '#4C735D',
        card: '#FFFFFF',
        border: '#B8CDA7',
        inputBackground: '#FFFFFF',
        placeholder: '#6B8377',
        accent: '#7D9A73',
        success: '#2F7A52',
        warning: '#9B7B39',
        danger: '#A74D4D',
      },
      dark: {
        text: '#E8F0EA',
        mutedText: '#B9CAC1',
        background: '#0F1814',
        tint: '#B8CDA7',
        icon: '#D0DDD5',
        tabIconDefault: '#95AEA2',
        tabIconSelected: '#B8CDA7',
        card: '#1A2720',
        border: '#4B6457',
        inputBackground: '#223128',
        placeholder: '#9EB0A7',
        accent: '#7D9A73',
        success: '#62B284',
        warning: '#D2AC69',
        danger: '#D98282',
      },
    },
  },
] as const satisfies readonly AppThemeDefinition[];

export type AppThemeId = (typeof APP_THEMES)[number]['id'];

const DEFAULT_THEME_ID: AppThemeId = 'cafe-classic';

export const DEFAULT_THEME = APP_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ?? APP_THEMES[0];

export const THEME_OPTIONS = APP_THEMES.map((theme) => ({
  id: theme.id,
  name: theme.name,
  description: theme.description,
  preview: theme.preview,
}));

export type ThemeColorName = keyof ThemeColors;

export function getThemeDefinition(themeId?: string) {
  return APP_THEMES.find((theme) => theme.id === themeId) ?? DEFAULT_THEME;
}

export function getThemeColors(themeId: string | undefined, mode: ThemeMode) {
  return getThemeDefinition(themeId).colors[mode];
}

// Backward-compatible default export used in a few places.
export const Colors = DEFAULT_THEME.colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
