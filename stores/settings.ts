import { create } from 'zustand';

type SettingsState = {
  syncEnabled: boolean;
  lastSyncAt: number | null;
  toggleSync: () => void;
  markSynced: () => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  syncEnabled: false,
  lastSyncAt: null,
  toggleSync: () => set((state) => ({ syncEnabled: !state.syncEnabled })),
  markSynced: () => set({ lastSyncAt: Math.floor(Date.now() / 1000) }),
}));
