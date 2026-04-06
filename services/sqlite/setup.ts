import type { SeedImportResult, SetupService } from '@/services/interfaces/setup';
import { db, dbReady } from '@/services/sqlite/database/db';
import { categories, discounts, employees, ingredients, productIngredients, products, restaurantTables, suppliers, surcharges } from '@/services/sqlite/database/schema';
import { parseSeedWorkbook } from '@/utils/excel-seed';
import { and, eq } from 'drizzle-orm';

export class SetupSqliteService implements SetupService {
  async importSeedFromExcel(content: Uint8Array): Promise<SeedImportResult> {
    await dbReady;
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

    for (const row of data.providers) {
      const existing = db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.name, row.name)).get();
      if (existing) {
        continue;
      }

      db.insert(suppliers)
        .values({
          name: row.name,
          phone: row.phone,
          notes: row.notes,
        })
        .run();
      result.inserted.suppliers += 1;
    }

    for (const row of data.employees) {
      const existing = db.select({ id: employees.id }).from(employees).where(eq(employees.name, row.name)).get();
      if (existing) {
        continue;
      }

      db.insert(employees)
        .values({
          name: row.name,
          salaryType: row.salaryType,
          rate: row.rate,
        })
        .run();
      result.inserted.employees += 1;
    }

    for (const row of data.categories) {
      const existing = db.select({ id: categories.id }).from(categories).where(eq(categories.name, row.name)).get();
      if (existing) {
        continue;
      }
      db.insert(categories).values({ name: row.name }).run();
      result.inserted.categories += 1;
    }

    for (const row of data.ingredients) {
      const existing = db.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.name, row.name)).get();
      if (existing) {
        continue;
      }
      db.insert(ingredients)
        .values({
          name: row.name,
          unit: row.unit,
          quantity: row.quantity,
          lowStockThreshold: row.lowStockThreshold,
          supplierId: null,
        })
        .run();
      result.inserted.ingredients += 1;
    }

    for (const row of data.products) {
      const existing = db.select({ id: products.id }).from(products).where(eq(products.name, row.name)).get();
      if (existing) {
        continue;
      }

      const categoryId = row.categoryName
        ? db.select({ id: categories.id }).from(categories).where(eq(categories.name, row.categoryName)).get()?.id ?? null
        : null;

      if (row.categoryName && !categoryId) {
        result.issues.push(`Product '${row.name}' skipped because category '${row.categoryName}' was not found.`);
        continue;
      }

      db.insert(products)
        .values({
          name: row.name,
          categoryId,
          price: row.price,
          isActive: row.isActive,
        })
        .run();
      result.inserted.products += 1;
    }

    for (const row of data.productIngredients) {
      const productId = db.select({ id: products.id }).from(products).where(eq(products.name, row.productName)).get()?.id;
      const ingredientId = db.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.name, row.ingredientName)).get()?.id;

      if (!productId || !ingredientId) {
        result.issues.push(`Recipe row skipped because product '${row.productName}' or ingredient '${row.ingredientName}' was not found.`);
        continue;
      }

      const existing = db
        .select({ id: productIngredients.id })
        .from(productIngredients)
        .where(and(eq(productIngredients.productId, productId), eq(productIngredients.ingredientId, ingredientId)))
        .get();

      if (existing) {
        continue;
      }

      db.insert(productIngredients)
        .values({
          productId,
          ingredientId,
          quantityUsed: row.quantityUsed,
        })
        .run();
      result.inserted.productIngredients += 1;
    }

    for (const row of data.restaurantTables) {
      const existing = db.select({ id: restaurantTables.id }).from(restaurantTables).where(eq(restaurantTables.name, row.name)).get();
      if (existing) {
        continue;
      }

      db.insert(restaurantTables)
        .values({
          name: row.name,
          tableType: row.tableType,
        })
        .run();
      result.inserted.restaurantTables += 1;
    }

    for (const row of data.discounts) {
      const existing = db.select({ id: discounts.id }).from(discounts).where(eq(discounts.name, row.name)).get();
      if (existing) {
        continue;
      }

      const productId = row.productName
        ? db.select({ id: products.id }).from(products).where(eq(products.name, row.productName)).get()?.id ?? null
        : null;

      if (row.scope === 'product' && !productId) {
        result.issues.push(`Discount '${row.name}' skipped because product '${row.productName ?? ''}' was not found.`);
        continue;
      }

      db.insert(discounts)
        .values({
          name: row.name,
          scope: row.scope,
          productId: row.scope === 'product' ? productId : null,
          type: row.type,
          value: row.value,
          startsAt: row.scope === 'global' ? 0 : row.startsAt,
          endsAt: row.scope === 'global' ? null : row.endsAt,
          isActive: row.isActive,
        })
        .run();
      result.inserted.discounts += 1;
    }

    for (const row of data.surcharges) {
      db.insert(surcharges)
        .values({ name: row.name, value: row.value })
        .onConflictDoUpdate({ target: surcharges.name, set: { value: row.value } })
        .run();
      result.inserted.surcharges += 1;
    }

    return result;
  }
}
