import { apiClient } from './api-client';

type SeedImportEntitySummary = {
  inserted: number;
  updated: number;
  skipped: number;
};

type SeedImportSummary = {
  paymentMethods: SeedImportEntitySummary;
  suppliers: SeedImportEntitySummary;
  employees: SeedImportEntitySummary;
  categories: SeedImportEntitySummary;
  ingredients: SeedImportEntitySummary;
  products: SeedImportEntitySummary;
  productIngredients: SeedImportEntitySummary;
  productAdditionalIngredients: SeedImportEntitySummary;
  restaurantTables: SeedImportEntitySummary;
  discounts: SeedImportEntitySummary;
  surcharges: SeedImportEntitySummary;
  receiptPreferences: SeedImportEntitySummary;
};

type SeedImportIssue = {
  code: string;
  entity: keyof SeedImportSummary | 'workbook';
  message: string;
  row?: number;
  column?: string;
};

export type SeedImportResult = {
  summary: SeedImportSummary;
  issues: SeedImportIssue[];
  importedAt: number;
  durationMs: number;
  templateVersion: 2;
};

const emptyEntitySummary = (): SeedImportEntitySummary => ({
  inserted: 0,
  updated: 0,
  skipped: 0,
});

const emptySeedImportSummary = (): SeedImportSummary => ({
  paymentMethods: emptyEntitySummary(),
  suppliers: emptyEntitySummary(),
  employees: emptyEntitySummary(),
  categories: emptyEntitySummary(),
  ingredients: emptyEntitySummary(),
  products: emptyEntitySummary(),
  productIngredients: emptyEntitySummary(),
  productAdditionalIngredients: emptyEntitySummary(),
  restaurantTables: emptyEntitySummary(),
  discounts: emptyEntitySummary(),
  surcharges: emptyEntitySummary(),
  receiptPreferences: emptyEntitySummary(),
});

export type ReceiptPreferences = {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessNit: string;
  businessLogoUri: string | null;
  footerMessage: string;
  paperWidth: 58 | 80;
  taxRate: number;
};

export type SetupStatus = {
  isSetupDone: boolean;
  activeOwnerCount: number;
};

export type SeedImportTemplateFile = {
  bytes: Uint8Array<ArrayBuffer>;
  fileName: string;
  contentType: string | null;
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
      return result || {
        summary: emptySeedImportSummary(),
        issues: [],
        importedAt: Math.floor(Date.now() / 1000),
        durationMs: 0,
        templateVersion: 2,
      };
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
      businessNit: '',
      businessLogoUri: null,
      footerMessage: '',
      paperWidth: 58,
      taxRate: 0,
    };
  }

  async saveReceiptPreferences(payload: ReceiptPreferences): Promise<void> {
    await apiClient.put('/setup/receipt-prefs', payload);
  }

  async downloadImportTemplate(): Promise<SeedImportTemplateFile> {
    const file = await apiClient.downloadFile('/setup/import-template', 'import-template-v2.xlsx');
    return {
      bytes: file.bytes,
      fileName: file.fileName,
      contentType: file.contentType,
    };
  }
}
