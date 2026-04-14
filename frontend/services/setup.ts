import { apiClient } from './api-client';

export type SeedImportSummary = {
  suppliers: number;
  employees: number;
  categories: number;
  ingredients: number;
  products: number;
  productIngredients: number;
  restaurantTables: number;
  discounts: number;
  surcharges: number;
};

export type SeedImportResult = {
  inserted: SeedImportSummary;
  issues: string[];
};

export type ReceiptPreferences = {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessLogoUri: string | null;
  footerMessage: string;
  paperWidth: 58 | 80;
  taxRate: number;
};

export type SetupStatus = {
  isSetupDone: boolean;
  activeOwnerCount: number;
};

export class SetupService {
  async getSetupStatus(): Promise<SetupStatus> {
    const response = await apiClient.get<SetupStatus>('/setup/status');
    return response || { isSetupDone: false, activeOwnerCount: 0 };
  }

  async importSeedFromExcel(content: Uint8Array): Promise<SeedImportResult> {
    try {
      const result = await apiClient.uploadFile<SeedImportResult>(
        '/setup/import',
        content,
        'seed.xlsx'
      );
      return result || { inserted: { suppliers: 0, employees: 0, categories: 0, ingredients: 0, products: 0, productIngredients: 0, restaurantTables: 0, discounts: 0, surcharges: 0 }, issues: [] };
    } catch (error) {
      throw error;
    }
  }

  async getReceiptPreferences(): Promise<ReceiptPreferences> {
    const response = await apiClient.get<ReceiptPreferences>('/setup/receipt-prefs');
    return response || {
      businessName: '',
      businessAddress: '',
      businessPhone: '',
      businessLogoUri: null,
      footerMessage: '',
      paperWidth: 58,
      taxRate: 0,
    };
  }

  async saveReceiptPreferences(payload: ReceiptPreferences): Promise<void> {
    await apiClient.put('/setup/receipt-prefs', payload);
  }
}
