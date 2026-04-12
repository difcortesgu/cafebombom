import { db } from '@/database';
import { ingredients, restockLogs, suppliers } from '@/database/schema';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, RestockLog, UpdateIngredientPayload } from '@/types/inventory';
import type { Ingredient, Supplier } from '@/types/types';
import { asc, desc, eq, sql } from 'drizzle-orm';

export class InventorySqliteService {
  async getHydrationData() {
    const ingredientsList = db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        unit: ingredients.unit,
        quantity: ingredients.quantity,
        low_stock_threshold: ingredients.lowStockThreshold,
        supplier_id: ingredients.supplierId,
      })
      .from(ingredients)
      .orderBy(asc(ingredients.name))
      .all() as Ingredient[];

    const suppliersList = db
      .select({ id: suppliers.id, name: suppliers.name, phone: suppliers.phone, notes: suppliers.notes })
      .from(suppliers)
      .orderBy(asc(suppliers.name))
      .all() as Supplier[];

    const restocksList = db
      .select({
        id: restockLogs.id,
        ingredient_name: ingredients.name,
        quantity_added: restockLogs.quantityAdded,
        cost: restockLogs.cost,
        date: restockLogs.date,
      })
      .from(restockLogs)
      .innerJoin(ingredients, eq(ingredients.id, restockLogs.ingredientId))
      .orderBy(desc(restockLogs.date))
      .limit(20)
      .all() as RestockLog[];

    return { ingredients: ingredientsList, suppliers: suppliersList, restocks: restocksList };
  }

  async addIngredient({ name, unit, quantity, lowStockThreshold, supplierId }: AddIngredientPayload): Promise<string> {
    const [inserted] = db.insert(ingredients)
      .values({ name, unit, quantity, lowStockThreshold, supplierId: supplierId ?? null })
      .returning({ id: ingredients.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create ingredient.');
    }

    return inserted.id;
  }

  async updateIngredient({ id, ...payload }: UpdateIngredientPayload): Promise<void> {
    const existing = db
      .select({
        name: ingredients.name,
        unit: ingredients.unit,
        quantity: ingredients.quantity,
        lowStockThreshold: ingredients.lowStockThreshold,
        supplierId: ingredients.supplierId,
      })
      .from(ingredients)
      .where(eq(ingredients.id, id))
      .get();

    if (!existing) {
      return;
    }

    db.update(ingredients)
      .set({
        name: payload.name ?? existing.name,
        unit: payload.unit ?? existing.unit,
        quantity: payload.quantity ?? existing.quantity,
        lowStockThreshold: payload.low_stock_threshold ?? existing.lowStockThreshold,
        supplierId: payload.supplier_id ?? existing.supplierId,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
        syncedAt: null,
      })
      .where(eq(ingredients.id, id))
      .run();
  }

  async addSupplier({ name, phone, notes }: AddSupplierPayload): Promise<string | null> {
    const [inserted] = db.insert(suppliers)
      .values({ name, phone: phone ?? null, notes: notes ?? null })
      .onConflictDoNothing()
      .returning({ id: suppliers.id })
      .all();

    return inserted?.id ?? null;
  }

  async addRestock({ ingredientId, quantityAdded, cost, supplierId }: AddRestockPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const [inserted] = db.insert(restockLogs)
      .values({ ingredientId, quantityAdded, cost, supplierId: supplierId ?? null, date: now })
      .returning({ id: restockLogs.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create restock log.');
    }

    db.update(ingredients)
      .set({
        quantity: sql`${ingredients.quantity} + ${quantityAdded}`,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
        syncedAt: null,
      })
      .where(eq(ingredients.id, ingredientId))
      .run();

    return inserted.id;
  }
}
