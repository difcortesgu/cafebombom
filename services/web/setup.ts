import type { SeedImportResult, SetupService } from '@/services/interfaces/setup';
import { parseSeedWorkbook } from '@/utils/excel-seed';

import { getDb } from './storage';

export class SetupWebService implements SetupService {
  async importSeedFromExcel(content: Uint8Array): Promise<SeedImportResult> {
    const db = await getDb();
    const data = parseSeedWorkbook(content);

    const result: SeedImportResult = {
      inserted: {
        suppliers: 0,
        employees: 0,
        categories: 0,
        ingredients: 0,
        products: 0,
        productIngredients: 0,
        restaurantTables: 0,
        discounts: 0,
        surcharges: 0,
      },
      issues: [],
    };

    await db.transaction(
      'rw',
      [db.suppliers, db.employees, db.categories, db.ingredients, db.products, db.productIngredients, db.restaurantTables, db.discounts, db.surcharges],
      async () => {
        for (const row of data.providers) {
          const existing = await db.suppliers.where('name').equals(row.name).first();
          if (existing) {
            continue;
          }

          const now = Math.floor(Date.now() / 1000);
          await db.suppliers.add({
            name: row.name,
            phone: row.phone,
            notes: row.notes,
          });
          result.inserted.suppliers += 1;
        }

        for (const row of data.employees) {
          const existing = await db.employees.where('name').equals(row.name).first();
          if (existing) {
            continue;
          }

          await db.employees.add({
            name: row.name,
            salaryType: row.salaryType,
            rate: row.rate,
          });
          result.inserted.employees += 1;
        }

        for (const row of data.categories) {
          const existing = await db.categories.where('name').equals(row.name).first();
          if (existing) {
            continue;
          }
          await db.categories.add({ name: row.name });
          result.inserted.categories += 1;
        }

        for (const row of data.ingredients) {
          const existing = await db.ingredients.where('name').equals(row.name).first();
          if (existing) {
            continue;
          }
          await db.ingredients.add({
            name: row.name,
            unit: row.unit,
            quantity: row.quantity,
            low_stock_threshold: row.lowStockThreshold,
            supplier_id: null,
          });
          result.inserted.ingredients += 1;
        }

        for (const row of data.products) {
          const existing = await db.products.where('name').equals(row.name).first();
          if (existing) {
            continue;
          }

          const categoryId = row.categoryName
            ? (await db.categories.where('name').equals(row.categoryName).first())?.id ?? null
            : null;

          if (row.categoryName && !categoryId) {
            result.issues.push(`Product '${row.name}' skipped because category '${row.categoryName}' was not found.`);
            continue;
          }

          await db.products.add({
            name: row.name,
            categoryId,
            price: row.price,
            isActive: row.isActive,
          });
          result.inserted.products += 1;
        }

        for (const row of data.productIngredients) {
          const productId = (await db.products.where('name').equals(row.productName).first())?.id;
          const ingredientId = (await db.ingredients.where('name').equals(row.ingredientName).first())?.id;

          if (!productId || !ingredientId) {
            result.issues.push(`Recipe row skipped because product '${row.productName}' or ingredient '${row.ingredientName}' was not found.`);
            continue;
          }

          const existing = await db.productIngredients.where('[productId+ingredientId]').equals([productId, ingredientId]).first();
          if (existing) {
            continue;
          }

          await db.productIngredients.add({
            productId,
            ingredientId,
            quantityUsed: row.quantityUsed,
          });
          result.inserted.productIngredients += 1;
        }

        for (const row of data.restaurantTables) {
          const existing = await db.restaurantTables.where('name').equals(row.name).first();
          if (existing) {
            continue;
          }

          const now = Math.floor(Date.now() / 1000);
          await db.restaurantTables.add({
            name: row.name,
            tableType: row.tableType,
            createdAt: now,
            updatedAt: now,
          });
          result.inserted.restaurantTables += 1;
        }

        for (const row of data.discounts) {
          const existing = await db.discounts.where('name').equals(row.name).first();
          if (existing) {
            continue;
          }

          const productId = row.productName
            ? (await db.products.where('name').equals(row.productName).first())?.id ?? null
            : null;

          if (row.scope === 'product' && !productId) {
            result.issues.push(`Discount '${row.name}' skipped because product '${row.productName ?? ''}' was not found.`);
            continue;
          }

          const now = Math.floor(Date.now() / 1000);
          await db.discounts.add({
            name: row.name,
            scope: row.scope,
            productId: row.scope === 'product' ? productId : null,
            type: row.type,
            value: row.value,
            startsAt: row.scope === 'global' ? 0 : row.startsAt,
            endsAt: row.scope === 'global' ? null : row.endsAt,
            isActive: row.isActive,
            createdAt: now,
            updatedAt: now,
          });
          result.inserted.discounts += 1;
        }

        for (const row of data.surcharges) {
          await db.surcharges.put({
            name: row.name,
            value: row.value,
            updatedAt: Math.floor(Date.now() / 1000),
          });
          result.inserted.surcharges += 1;
        }
      },
    );

    return result;
  }
}
