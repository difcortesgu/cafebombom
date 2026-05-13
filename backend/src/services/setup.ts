import { db } from '@/database';
import {
  categories,
  discounts,
  employees,
  ingredients,
  ingredientUnits,
  productAdditionalIngredients,
  productIngredients,
  products,
  receiptPreferences,
  restaurantTables,
  suppliers,
  surcharges,
} from '@/database/schema';
import { parseSeedWorkbook, SeedImportValidationError } from '@/services/seed-import';
import { ReceiptPreferences } from '@/types/receipt';
import { SeedImportEntitySummary, SeedImportIssue, SeedImportResult, SeedImportSummary } from '@/types/setup';
import { and, eq } from 'drizzle-orm';

const RECEIPT_PREFERENCES_ID = 'default';
const DEFAULT_RECEIPT_PREFERENCES: ReceiptPreferences = {
  businessName: 'CafeBomBom',
  businessAddress: '',
  businessPhone: '',
  businessNit: '',
  businessLogoUri: null,
  footerMessage: 'Gracias por tu compra',
  paperWidth: 80,
  taxRate: 0.08,
};

const emptyEntitySummary = (): SeedImportEntitySummary => ({
  inserted: 0,
  updated: 0,
  skipped: 0,
});

const emptySummary = (): SeedImportSummary => ({
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

export class SetupSqliteService {
  async getReceiptPreferences(): Promise<ReceiptPreferences> {
    const record = db
      .select({
        businessName: receiptPreferences.businessName,
        businessAddress: receiptPreferences.businessAddress,
        businessPhone: receiptPreferences.businessPhone,
        businessNit: receiptPreferences.businessNit,
        businessLogoUri: receiptPreferences.businessLogoUri,
        footerMessage: receiptPreferences.footerMessage,
        paperWidth: receiptPreferences.paperWidth,
        taxRate: receiptPreferences.taxRate,
      })
      .from(receiptPreferences)
      .where(eq(receiptPreferences.id, RECEIPT_PREFERENCES_ID))
      .get();

    if (!record) {
      return DEFAULT_RECEIPT_PREFERENCES;
    }

    const paperWidth = Number(record.paperWidth) === 58 ? 58 : 80;
    const taxRate = Number.isFinite(Number(record.taxRate)) ? Number(record.taxRate) : DEFAULT_RECEIPT_PREFERENCES.taxRate;

    return {
      businessName: record.businessName,
      businessAddress: record.businessAddress,
      businessPhone: record.businessPhone,
      businessNit: record.businessNit,
      businessLogoUri: record.businessLogoUri,
      footerMessage: record.footerMessage,
      paperWidth,
      taxRate,
    };
  }

  async saveReceiptPreferences(payload: ReceiptPreferences): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    db.insert(receiptPreferences)
      .values({
        id: RECEIPT_PREFERENCES_ID,
        businessName: payload.businessName,
        businessAddress: payload.businessAddress,
        businessPhone: payload.businessPhone,
        businessNit: payload.businessNit,
        businessLogoUri: payload.businessLogoUri,
        footerMessage: payload.footerMessage,
        paperWidth: payload.paperWidth,
        taxRate: payload.taxRate,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: receiptPreferences.id,
        set: {
          businessName: payload.businessName,
          businessAddress: payload.businessAddress,
          businessPhone: payload.businessPhone,
          businessNit: payload.businessNit,
          businessLogoUri: payload.businessLogoUri,
          footerMessage: payload.footerMessage,
          paperWidth: payload.paperWidth,
          taxRate: payload.taxRate,
          updatedAt: now,
        },
      })
      .run();
  }

  async importSeedFromExcel(content: Uint8Array): Promise<SeedImportResult> {
    const startedAt = Date.now();
    const data = parseSeedWorkbook(content);

    const issues: SeedImportIssue[] = [];
    const summary = emptySummary();

    try {
      db.transaction((tx) => {
        for (const row of data.providers) {
          const existing = tx.select({ id: suppliers.id, phone: suppliers.phone, notes: suppliers.notes }).from(suppliers).where(eq(suppliers.name, row.name)).get();

          if (!existing) {
            tx.insert(suppliers).values({ name: row.name, phone: row.phone, notes: row.notes }).run();
            summary.suppliers.inserted += 1;
            continue;
          }

          if (existing.phone === row.phone && existing.notes === row.notes) {
            summary.suppliers.skipped += 1;
            continue;
          }

          tx.update(suppliers).set({ phone: row.phone, notes: row.notes }).where(eq(suppliers.id, existing.id)).run();
          summary.suppliers.updated += 1;
        }

        for (const row of data.employees) {
          const existing = tx.select({ id: employees.id, salaryType: employees.salaryType, rate: employees.rate }).from(employees).where(eq(employees.name, row.name)).get();

          if (!existing) {
            tx.insert(employees).values({ name: row.name, salaryType: row.salaryType, rate: row.rate }).run();
            summary.employees.inserted += 1;
            continue;
          }

          if (existing.salaryType === row.salaryType && Number(existing.rate) === row.rate) {
            summary.employees.skipped += 1;
            continue;
          }

          tx.update(employees).set({ salaryType: row.salaryType, rate: row.rate }).where(eq(employees.id, existing.id)).run();
          summary.employees.updated += 1;
        }

        for (const row of data.categories) {
          const existing = tx.select({ id: categories.id }).from(categories).where(eq(categories.name, row.name)).get();
          if (existing) {
            summary.categories.skipped += 1;
            continue;
          }

          tx.insert(categories).values({ name: row.name }).run();
          summary.categories.inserted += 1;
        }

        for (const row of data.ingredients) {
          const normalizedUnit = String(row.unit).trim().toLowerCase();
          if (!normalizedUnit) {
            issues.push({
              code: 'INVALID_INGREDIENT_UNIT',
              entity: 'ingredients',
              message: `Ingredient '${row.name}' has empty unit.`,
              row: row.rowNumber,
              column: 'unit',
            });
            throw new SeedImportValidationError('Invalid ingredient unit.', issues);
          }

          const existingUnit = tx.select({ id: ingredientUnits.id }).from(ingredientUnits).where(eq(ingredientUnits.name, normalizedUnit)).get();
          if (!existingUnit) {
            tx.insert(ingredientUnits).values({ name: normalizedUnit }).run();
          }

          const supplierId = row.supplierName
            ? tx.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.name, row.supplierName)).get()?.id ?? null
            : null;

          if (row.supplierName && !supplierId) {
            issues.push({
              code: 'SUPPLIER_NOT_FOUND',
              entity: 'ingredients',
              message: `Ingredient '${row.name}' references unknown supplier '${row.supplierName}'.`,
              row: row.rowNumber,
              column: 'supplierName',
            });
            throw new SeedImportValidationError('Unknown supplier in ingredients sheet.', issues);
          }

          const existing = tx
            .select({
              id: ingredients.id,
              unit: ingredients.unit,
              quantity: ingredients.quantity,
              lowStockThreshold: ingredients.lowStockThreshold,
              supplierId: ingredients.supplierId,
            })
            .from(ingredients)
            .where(eq(ingredients.name, row.name))
            .get();

          if (!existing) {
            tx
              .insert(ingredients)
              .values({
                name: row.name,
                unit: normalizedUnit,
                quantity: row.quantity,
                lowStockThreshold: row.lowStockThreshold,
                supplierId,
              })
              .run();
            summary.ingredients.inserted += 1;
            continue;
          }

          if (
            existing.unit === normalizedUnit &&
            Number(existing.quantity) === row.quantity &&
            Number(existing.lowStockThreshold) === row.lowStockThreshold &&
            existing.supplierId === supplierId
          ) {
            summary.ingredients.skipped += 1;
            continue;
          }

          tx
            .update(ingredients)
            .set({
              unit: normalizedUnit,
              quantity: row.quantity,
              lowStockThreshold: row.lowStockThreshold,
              supplierId,
            })
            .where(eq(ingredients.id, existing.id))
            .run();
          summary.ingredients.updated += 1;
        }

        for (const row of data.products) {
          const categoryId = row.categoryName
            ? tx.select({ id: categories.id }).from(categories).where(eq(categories.name, row.categoryName)).get()?.id ?? null
            : null;

          if (row.categoryName && !categoryId) {
            issues.push({
              code: 'CATEGORY_NOT_FOUND',
              entity: 'products',
              message: `Product '${row.name}' references unknown category '${row.categoryName}'.`,
              row: row.rowNumber,
              column: 'categoryName',
            });
            throw new SeedImportValidationError('Unknown category in products sheet.', issues);
          }

          const existing = tx
            .select({
              id: products.id,
              categoryId: products.categoryId,
              price: products.price,
              isActive: products.isActive,
              imageUri: products.imageUri,
            })
            .from(products)
            .where(eq(products.name, row.name))
            .get();

          if (!existing) {
            tx
              .insert(products)
              .values({
                name: row.name,
                categoryId,
                price: row.price,
                isActive: row.isActive,
                imageUri: row.imageUri,
              })
              .run();
            summary.products.inserted += 1;
            continue;
          }

          if (
            existing.categoryId === categoryId &&
            Number(existing.price) === row.price &&
            Boolean(existing.isActive) === row.isActive &&
            existing.imageUri === row.imageUri
          ) {
            summary.products.skipped += 1;
            continue;
          }

          tx
            .update(products)
            .set({
              categoryId,
              price: row.price,
              isActive: row.isActive,
              imageUri: row.imageUri,
            })
            .where(eq(products.id, existing.id))
            .run();
          summary.products.updated += 1;
        }

        for (const row of data.productIngredients) {
          const productId = tx.select({ id: products.id }).from(products).where(eq(products.name, row.productName)).get()?.id;
          const ingredientId = tx.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.name, row.ingredientName)).get()?.id;

          if (!productId || !ingredientId) {
            issues.push({
              code: 'RECIPE_REFERENCE_NOT_FOUND',
              entity: 'productIngredients',
              message: `Recipe references unknown product '${row.productName}' or ingredient '${row.ingredientName}'.`,
              row: row.rowNumber,
            });
            throw new SeedImportValidationError('Invalid recipe reference.', issues);
          }

          const existing = tx
            .select({ id: productIngredients.id, quantityUsed: productIngredients.quantityUsed })
            .from(productIngredients)
            .where(and(eq(productIngredients.productId, productId), eq(productIngredients.ingredientId, ingredientId)))
            .get();

          if (!existing) {
            tx.insert(productIngredients).values({ productId, ingredientId, quantityUsed: row.quantityUsed }).run();
            summary.productIngredients.inserted += 1;
            continue;
          }

          if (Number(existing.quantityUsed) === row.quantityUsed) {
            summary.productIngredients.skipped += 1;
            continue;
          }

          tx.update(productIngredients).set({ quantityUsed: row.quantityUsed }).where(eq(productIngredients.id, existing.id)).run();
          summary.productIngredients.updated += 1;
        }

        for (const row of data.productAdditionalIngredients) {
          const productId = tx.select({ id: products.id }).from(products).where(eq(products.name, row.productName)).get()?.id;
          const ingredientId = tx.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.name, row.ingredientName)).get()?.id;

          if (!productId || !ingredientId) {
            issues.push({
              code: 'EXTRA_REFERENCE_NOT_FOUND',
              entity: 'productAdditionalIngredients',
              message: `Additional ingredient references unknown product '${row.productName}' or ingredient '${row.ingredientName}'.`,
              row: row.rowNumber,
            });
            throw new SeedImportValidationError('Invalid additional ingredient reference.', issues);
          }

          const existing = tx
            .select({
              id: productAdditionalIngredients.id,
              quantityUsed: productAdditionalIngredients.quantityUsed,
              additionalPrice: productAdditionalIngredients.additionalPrice,
            })
            .from(productAdditionalIngredients)
            .where(and(eq(productAdditionalIngredients.productId, productId), eq(productAdditionalIngredients.ingredientId, ingredientId)))
            .get();

          if (!existing) {
            tx
              .insert(productAdditionalIngredients)
              .values({
                productId,
                ingredientId,
                quantityUsed: row.quantityUsed,
                additionalPrice: row.additionalPrice,
              })
              .run();
            summary.productAdditionalIngredients.inserted += 1;
            continue;
          }

          if (Number(existing.quantityUsed) === row.quantityUsed && Number(existing.additionalPrice) === row.additionalPrice) {
            summary.productAdditionalIngredients.skipped += 1;
            continue;
          }

          tx
            .update(productAdditionalIngredients)
            .set({
              quantityUsed: row.quantityUsed,
              additionalPrice: row.additionalPrice,
            })
            .where(eq(productAdditionalIngredients.id, existing.id))
            .run();
          summary.productAdditionalIngredients.updated += 1;
        }

        for (const row of data.restaurantTables) {
          const existing = tx
            .select({ id: restaurantTables.id, tableType: restaurantTables.tableType })
            .from(restaurantTables)
            .where(eq(restaurantTables.name, row.name))
            .get();

          if (!existing) {
            tx.insert(restaurantTables).values({ name: row.name, tableType: row.tableType }).run();
            summary.restaurantTables.inserted += 1;
            continue;
          }

          if (existing.tableType === row.tableType) {
            summary.restaurantTables.skipped += 1;
            continue;
          }

          tx.update(restaurantTables).set({ tableType: row.tableType }).where(eq(restaurantTables.id, existing.id)).run();
          summary.restaurantTables.updated += 1;
        }

        for (const row of data.discounts) {
          const productId = row.productName
            ? tx.select({ id: products.id }).from(products).where(eq(products.name, row.productName)).get()?.id ?? null
            : null;

          if (row.scope === 'product' && !productId) {
            issues.push({
              code: 'DISCOUNT_PRODUCT_NOT_FOUND',
              entity: 'discounts',
              message: `Discount '${row.name}' references unknown product '${row.productName ?? ''}'.`,
              row: row.rowNumber,
            });
            throw new SeedImportValidationError('Unknown product in discounts sheet.', issues);
          }

          const existing = tx
            .select({
              id: discounts.id,
              scope: discounts.scope,
              productId: discounts.productId,
              type: discounts.type,
              value: discounts.value,
              startsAt: discounts.startsAt,
              endsAt: discounts.endsAt,
              isActive: discounts.isActive,
            })
            .from(discounts)
            .where(eq(discounts.name, row.name))
            .get();

          const nextStartsAt = row.scope === 'global' ? 0 : row.startsAt;
          const nextEndsAt = row.scope === 'global' ? null : row.endsAt;

          if (!existing) {
            tx
              .insert(discounts)
              .values({
                name: row.name,
                scope: row.scope,
                productId: row.scope === 'product' ? productId : null,
                type: row.type,
                value: row.value,
                startsAt: nextStartsAt,
                endsAt: nextEndsAt,
                isActive: row.isActive,
              })
              .run();
            summary.discounts.inserted += 1;
            continue;
          }

          if (
            existing.scope === row.scope &&
            existing.productId === (row.scope === 'product' ? productId : null) &&
            existing.type === row.type &&
            Number(existing.value) === row.value &&
            Number(existing.startsAt) === nextStartsAt &&
            (existing.endsAt ?? null) === nextEndsAt &&
            Boolean(existing.isActive) === row.isActive
          ) {
            summary.discounts.skipped += 1;
            continue;
          }

          tx
            .update(discounts)
            .set({
              scope: row.scope,
              productId: row.scope === 'product' ? productId : null,
              type: row.type,
              value: row.value,
              startsAt: nextStartsAt,
              endsAt: nextEndsAt,
              isActive: row.isActive,
            })
            .where(eq(discounts.id, existing.id))
            .run();
          summary.discounts.updated += 1;
        }

        for (const row of data.surcharges) {
          const existing = tx.select({ name: surcharges.name, value: surcharges.value }).from(surcharges).where(eq(surcharges.name, row.name)).get();

          if (!existing) {
            tx.insert(surcharges).values({ name: row.name, value: row.value }).run();
            summary.surcharges.inserted += 1;
            continue;
          }

          if (Number(existing.value) === row.value) {
            summary.surcharges.skipped += 1;
            continue;
          }

          tx.update(surcharges).set({ value: row.value }).where(eq(surcharges.name, row.name)).run();
          summary.surcharges.updated += 1;
        }

        const latestReceiptPrefs = data.receiptPreferences[data.receiptPreferences.length - 1];
        if (latestReceiptPrefs) {
          const existing = tx
            .select({
              id: receiptPreferences.id,
              businessName: receiptPreferences.businessName,
              businessAddress: receiptPreferences.businessAddress,
              businessPhone: receiptPreferences.businessPhone,
              businessNit: receiptPreferences.businessNit,
              businessLogoUri: receiptPreferences.businessLogoUri,
              footerMessage: receiptPreferences.footerMessage,
              paperWidth: receiptPreferences.paperWidth,
              taxRate: receiptPreferences.taxRate,
            })
            .from(receiptPreferences)
            .where(eq(receiptPreferences.id, RECEIPT_PREFERENCES_ID))
            .get();

          if (!existing) {
            tx
              .insert(receiptPreferences)
              .values({
                id: RECEIPT_PREFERENCES_ID,
                businessName: latestReceiptPrefs.businessName,
                businessAddress: latestReceiptPrefs.businessAddress,
                businessPhone: latestReceiptPrefs.businessPhone,
                businessNit: latestReceiptPrefs.businessNit,
                businessLogoUri: latestReceiptPrefs.businessLogoUri,
                footerMessage: latestReceiptPrefs.footerMessage,
                paperWidth: latestReceiptPrefs.paperWidth,
                taxRate: latestReceiptPrefs.taxRate,
              })
              .run();
            summary.receiptPreferences.inserted += 1;
          } else if (
            existing.businessName === latestReceiptPrefs.businessName &&
            existing.businessAddress === latestReceiptPrefs.businessAddress &&
            existing.businessPhone === latestReceiptPrefs.businessPhone &&
            existing.businessNit === latestReceiptPrefs.businessNit &&
            existing.businessLogoUri === latestReceiptPrefs.businessLogoUri &&
            existing.footerMessage === latestReceiptPrefs.footerMessage &&
            Number(existing.paperWidth) === latestReceiptPrefs.paperWidth &&
            Number(existing.taxRate) === latestReceiptPrefs.taxRate
          ) {
            summary.receiptPreferences.skipped += 1;
          } else {
            tx
              .update(receiptPreferences)
              .set({
                businessName: latestReceiptPrefs.businessName,
                businessAddress: latestReceiptPrefs.businessAddress,
                businessPhone: latestReceiptPrefs.businessPhone,
                businessNit: latestReceiptPrefs.businessNit,
                businessLogoUri: latestReceiptPrefs.businessLogoUri,
                footerMessage: latestReceiptPrefs.footerMessage,
                paperWidth: latestReceiptPrefs.paperWidth,
                taxRate: latestReceiptPrefs.taxRate,
              })
              .where(eq(receiptPreferences.id, RECEIPT_PREFERENCES_ID))
              .run();
            summary.receiptPreferences.updated += 1;
          }
        }
      });
    } catch (error) {
      if (error instanceof SeedImportValidationError) {
        throw error;
      }

      throw new SeedImportValidationError('Seed import failed and all changes were rolled back.', [
        {
          code: 'IMPORT_TRANSACTION_FAILED',
          entity: 'workbook',
          message: 'The import transaction was rolled back due to an unexpected write error.',
        },
      ]);
    }

    return {
      summary,
      issues,
      importedAt: Math.floor(Date.now() / 1000),
      durationMs: Date.now() - startedAt,
      templateVersion: 2,
    };
  }
}
