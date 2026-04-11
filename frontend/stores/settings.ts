import { create } from 'zustand';

import { type AppThemeId } from '@/constants/theme';
import { salesService, setupService } from '@/services';
import type { BusinessInfo, ReceiptPaperWidth } from '@/types/receipt';
import { COLOMBIAN_IVA_RATE } from '@/utils/tax';

export type ThemeModePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  syncEnabled: boolean;
  lastSyncAt: number | null;
  selectedThemeId: AppThemeId;
  themeModePreference: ThemeModePreference;
  deliverySurcharge: number;
  toGoSurcharge: number;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessLogoUri: string | null;
  receiptFooterMessage: string;
  printerPaperWidth: ReceiptPaperWidth;
  taxRate: number;
  hydrateFromDb: () => Promise<void>;
  toggleSync: () => void;
  markSynced: () => void;
  setTheme: (themeId: AppThemeId) => void;
  setThemeModePreference: (mode: ThemeModePreference) => void;
  setDeliverySurcharge: (value: number) => void;
  setToGoSurcharge: (value: number) => void;
  setBusinessInfo: (patch: Partial<BusinessInfo>) => void;
  setPrinterPaperWidth: (width: ReceiptPaperWidth) => void;
  setTaxRate: (rate: number) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  syncEnabled: false,
  lastSyncAt: null,
  selectedThemeId: 'cafe-classic',
  themeModePreference: 'system',
  deliverySurcharge: 0,
  toGoSurcharge: 0,
  businessName: 'CafeBomBom',
  businessAddress: '',
  businessPhone: '',
  businessLogoUri: null,
  receiptFooterMessage: 'Gracias por tu compra',
  printerPaperWidth: 80,
  taxRate: COLOMBIAN_IVA_RATE,
  hydrateFromDb: async () => {
    const [config, receiptConfig] = await Promise.all([
      salesService.getOrderTypeSurchargeConfig(),
      setupService.getReceiptPreferences(),
    ]);
    set({
      deliverySurcharge: config.deliverySurcharge,
      toGoSurcharge: config.toGoSurcharge,
      businessName: receiptConfig.businessName,
      businessAddress: receiptConfig.businessAddress,
      businessPhone: receiptConfig.businessPhone,
      businessLogoUri: receiptConfig.businessLogoUri,
      receiptFooterMessage: receiptConfig.footerMessage,
      printerPaperWidth: receiptConfig.paperWidth,
      taxRate: receiptConfig.taxRate,
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
  setBusinessInfo: (patch) => {
    set((state) => ({
      businessName: patch.name ?? state.businessName,
      businessAddress: patch.address ?? state.businessAddress,
      businessPhone: patch.phone ?? state.businessPhone,
      businessLogoUri: patch.logoUri === undefined ? state.businessLogoUri : patch.logoUri,
      receiptFooterMessage: patch.footerMessage ?? state.receiptFooterMessage,
    }));

    const state = get();
    void setupService.saveReceiptPreferences({
      businessName: state.businessName,
      businessAddress: state.businessAddress,
      businessPhone: state.businessPhone,
      businessLogoUri: state.businessLogoUri,
      footerMessage: state.receiptFooterMessage,
      paperWidth: state.printerPaperWidth,
      taxRate: state.taxRate,
    });
  },
  setPrinterPaperWidth: (width) => {
    set({ printerPaperWidth: width });
    const state = get();
    void setupService.saveReceiptPreferences({
      businessName: state.businessName,
      businessAddress: state.businessAddress,
      businessPhone: state.businessPhone,
      businessLogoUri: state.businessLogoUri,
      footerMessage: state.receiptFooterMessage,
      paperWidth: width,
      taxRate: state.taxRate,
    });
  },
  setTaxRate: (rate) => {
    const normalized = Number.isFinite(rate) ? Math.max(0, rate) : COLOMBIAN_IVA_RATE;
    set({ taxRate: normalized });
    const state = get();
    void setupService.saveReceiptPreferences({
      businessName: state.businessName,
      businessAddress: state.businessAddress,
      businessPhone: state.businessPhone,
      businessLogoUri: state.businessLogoUri,
      footerMessage: state.receiptFooterMessage,
      paperWidth: state.printerPaperWidth,
      taxRate: normalized,
    });
  },
}));
