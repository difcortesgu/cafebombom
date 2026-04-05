import { create } from 'zustand';

import { type AppThemeId } from '@/constants/theme';
import { salesService } from '@/services';

export type ThemeModePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  syncEnabled: boolean;
  lastSyncAt: number | null;
  selectedThemeId: AppThemeId;
  themeModePreference: ThemeModePreference;
  deliverySurcharge: number;
  toGoSurcharge: number;
  hydrateFromDb: () => Promise<void>;
  toggleSync: () => void;
  markSynced: () => void;
  setTheme: (themeId: AppThemeId) => void;
  setThemeModePreference: (mode: ThemeModePreference) => void;
  setDeliverySurcharge: (value: number) => void;
  setToGoSurcharge: (value: number) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  syncEnabled: false,
  lastSyncAt: null,
  selectedThemeId: 'cafe-classic',
  themeModePreference: 'system',
  deliverySurcharge: 0,
  toGoSurcharge: 0,
  hydrateFromDb: async () => {
    const config = await salesService.getOrderTypeSurchargeConfig();
    set({
      deliverySurcharge: config.deliverySurcharge,
      toGoSurcharge: config.toGoSurcharge,
    });
  },
  toggleSync: () => set((state) => ({ syncEnabled: !state.syncEnabled })),
  markSynced: () => set({ lastSyncAt: Math.floor(Date.now() / 1000) }),
  setTheme: (themeId) => set({ selectedThemeId: themeId }),
  setThemeModePreference: (mode) => set({ themeModePreference: mode }),
  setDeliverySurcharge: (value) => {
    const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
    set({ deliverySurcharge: normalized });
    const state = get();
    void salesService.saveOrderTypeSurchargeConfig({
      toGoSurcharge: state.toGoSurcharge,
      deliverySurcharge: normalized,
    });
  },
  setToGoSurcharge: (value) => {
    const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
    set({ toGoSurcharge: normalized });
    const state = get();
    void salesService.saveOrderTypeSurchargeConfig({
      toGoSurcharge: normalized,
      deliverySurcharge: state.deliverySurcharge,
    });
  },
}));
