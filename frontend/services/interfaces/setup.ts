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

export interface SetupService {
  importSeedFromExcel(content: Uint8Array): Promise<SeedImportResult>;
  getReceiptPreferences(): Promise<ReceiptPreferences>;
  saveReceiptPreferences(payload: ReceiptPreferences): Promise<void>;
}
