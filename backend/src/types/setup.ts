export type SeedImportEntitySummary = {
  inserted: number;
  updated: number;
  skipped: number;
};

export type SeedImportSummary = {
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

export type SeedImportIssue = {
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