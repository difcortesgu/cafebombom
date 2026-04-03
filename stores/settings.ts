import { create } from 'zustand';

import { type AppThemeId } from '@/constants/theme';

export type ThemeModePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  syncEnabled: boolean;
  lastSyncAt: number | null;
  selectedThemeId: AppThemeId;
  themeModePreference: ThemeModePreference;
  toggleSync: () => void;
  markSynced: () => void;
  setTheme: (themeId: AppThemeId) => void;
  setThemeModePreference: (mode: ThemeModePreference) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  syncEnabled: false,
  lastSyncAt: null,
  selectedThemeId: 'cafe-classic',
  themeModePreference: 'system',
  toggleSync: () => set((state) => ({ syncEnabled: !state.syncEnabled })),
  markSynced: () => set({ lastSyncAt: Math.floor(Date.now() / 1000) }),
  setTheme: (themeId) => set({ selectedThemeId: themeId }),
  setThemeModePreference: (mode) => set({ themeModePreference: mode }),
}));
