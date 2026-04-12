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

export class SetupService {
  async importSeedFromExcel(content: Uint8Array): Promise<SeedImportResult> {
    // Implementation goes here
    return { inserted: { suppliers: 0, employees: 0, categories: 0, ingredients: 0, products: 0, productIngredients: 0, restaurantTables: 0, discounts: 0, surcharges: 0 }, issues: [] };
  }

  async getReceiptPreferences(): Promise<ReceiptPreferences> {
    // Implementation goes here
    return { businessName: '', businessAddress: '', businessPhone: '', businessLogoUri: null, footerMessage: '', paperWidth: 58, taxRate: 0 };
  }

  async saveReceiptPreferences(payload: ReceiptPreferences): Promise<void> {
    // Implementation goes here
  }
}
