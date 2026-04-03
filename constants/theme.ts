/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#B64D1A';
const tintColorDark = '#F8C08A';

export const Colors = {
  light: {
    text: '#1D130D',
    mutedText: '#5A4738',
    background: '#FFFCF8',
    tint: tintColorLight,
    icon: '#4E4035',
    tabIconDefault: '#4E4035',
    tabIconSelected: tintColorLight,
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
    tint: tintColorDark,
    icon: '#E0D3C5',
    tabIconDefault: '#CABDAF',
    tabIconSelected: tintColorDark,
    card: '#241D18',
    border: '#6A5545',
    inputBackground: '#2E251F',
    placeholder: '#BCA996',
    accent: '#F39B55',
    success: '#62B37C',
    warning: '#E6A35C',
    danger: '#EC7A6F',
  },
};

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
