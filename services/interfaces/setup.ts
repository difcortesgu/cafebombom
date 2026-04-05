export type SeedImportSummary = {
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

export interface SetupService {
  importSeedFromExcel(content: Uint8Array): Promise<SeedImportResult>;
}
