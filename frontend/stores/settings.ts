import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { type AppThemeId } from '@/constants/theme';
import { salesService, setupService } from '@/services';
import type { BusinessInfo, ReceiptPaperWidth } from '@/types/receipt';
import { COLOMBIAN_IVA_RATE } from '@/utils/tax';

export type ThemeModePreference = 'system' | 'light' | 'dark';

const PRINTER_DEVICE_STORAGE_KEY = 'settings.bluetooth-printer-device';

type StoredPrinterDevice = {
  name: string;
  address: string;
};

async function readStoredPrinterDevice(): Promise<StoredPrinterDevice | null> {
  try {
    const raw = await AsyncStorage.getItem(PRINTER_DEVICE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { name?: unknown; address?: unknown };
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const address = typeof parsed.address === 'string' ? parsed.address.trim() : '';
    if (!address) {
      return null;
    }

    return { name, address };
  } catch {
    return null;
  }
}

async function writeStoredPrinterDevice(device: StoredPrinterDevice | null): Promise<void> {
  try {
    if (!device || !device.address) {
      await AsyncStorage.removeItem(PRINTER_DEVICE_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(PRINTER_DEVICE_STORAGE_KEY, JSON.stringify(device));
  } catch {
    // Ignore persistence errors so settings updates remain non-blocking.
  }
}

type SettingsState = {
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
  printerDeviceName: string;
  printerDeviceAddress: string;
  hydrateFromDb: () => Promise<void>;
  setTheme: (themeId: AppThemeId) => void;
  setThemeModePreference: (mode: ThemeModePreference) => void;
  setDeliverySurcharge: (value: number) => void;
  setToGoSurcharge: (value: number) => void;
  setBusinessInfo: (patch: Partial<BusinessInfo>) => void;
  setPrinterPaperWidth: (width: ReceiptPaperWidth) => void;
  setTaxRate: (rate: number) => void;
  setPrinterDevice: (patch: { name?: string; address?: string }) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
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
  printerDeviceName: '',
  printerDeviceAddress: '',
  hydrateFromDb: async () => {
    const [config, receiptConfig, storedPrinter] = await Promise.all([
      salesService.getOrderTypeSurchargeConfig(),
      setupService.getReceiptPreferences(),
      readStoredPrinterDevice(),
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
      printerDeviceName: storedPrinter?.name ?? '',
      printerDeviceAddress: storedPrinter?.address ?? '',
    });
  },
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
  setPrinterDevice: (patch) => {
    const current = get();
    const nextName = patch.name == null ? current.printerDeviceName : patch.name.trim();
    const nextAddress = patch.address == null ? current.printerDeviceAddress : patch.address.trim();

    set({
      printerDeviceName: nextName,
      printerDeviceAddress: nextAddress,
    });

    void writeStoredPrinterDevice(
      nextAddress
        ? {
          name: nextName,
          address: nextAddress,
        }
        : null,
    );
  },
}));
