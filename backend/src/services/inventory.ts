import { db } from '../database';
import { expenses, ingredientUnits, ingredients, restockLogs, suppliers } from '../database/schema';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, AddUnitPayload, DeleteUnitPayload, InventoryUnit, RestockLog, UpdateIngredientPayload, UpdateSupplierPayload } from '../types/inventory';
import type { Ingredient, Supplier } from '../types/types';
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

    const unitsList = db
      .select({
        id: ingredientUnits.id,
        name: ingredientUnits.name,
      })
      .from(ingredientUnits)
      .orderBy(asc(ingredientUnits.name))
      .all() as InventoryUnit[];

    return { ingredients: ingredientsList, suppliers: suppliersList, restocks: restocksList, units: unitsList };
  }

  unitExists(name: string): boolean {
    const existing = db
      .select({ id: ingredientUnits.id })
      .from(ingredientUnits)
      .where(eq(ingredientUnits.name, name))
      .get();

    return Boolean(existing);
  }

  async addIngredient({ name, unit, lowStockThreshold, supplierId }: AddIngredientPayload): Promise<string> {
    const [inserted] = db.insert(ingredients)
      .values({ name, unit, quantity: 0, lowStockThreshold, supplierId: supplierId ?? null })
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
        lowStockThreshold: payload.low_stock_threshold ?? existing.lowStockThreshold,
        supplierId: payload.supplier_id ?? existing.supplierId,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
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

  async updateSupplier({ id, name, phone, notes }: UpdateSupplierPayload): Promise<void> {
    const existing = db
      .select({ name: suppliers.name, phone: suppliers.phone, notes: suppliers.notes })
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .get();

    if (!existing) return;

    db.update(suppliers)
      .set({
        name: name ?? existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        notes: notes !== undefined ? notes : existing.notes,
      })
      .where(eq(suppliers.id, id))
      .run();
  }

  async addUnit({ name }: AddUnitPayload): Promise<InventoryUnit | null> {
    const now = Math.floor(Date.now() / 1000);
    const [inserted] = db.insert(ingredientUnits)
      .values({ name, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .returning({ id: ingredientUnits.id, name: ingredientUnits.name })
      .all() as InventoryUnit[];

    return inserted ?? null;
  }

  async deleteUnit({ id }: DeleteUnitPayload): Promise<'deleted' | 'in-use' | 'not-found'> {
    const targetUnit = db
      .select({ id: ingredientUnits.id, name: ingredientUnits.name })
      .from(ingredientUnits)
      .where(eq(ingredientUnits.id, id))
      .get();

    if (!targetUnit) {
      return 'not-found';
    }

    const usage = db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.unit, targetUnit.name))
      .get();

    if (usage) {
      return 'in-use';
    }

    db.delete(ingredientUnits)
      .where(eq(ingredientUnits.id, id))
      .run();

    return 'deleted';
  }

  async addRestock({ ingredientId, quantityAdded, cost, supplierId, paymentMethodId }: AddRestockPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const ingredient = db
      .select({ name: ingredients.name, unit: ingredients.unit })
      .from(ingredients)
      .where(eq(ingredients.id, ingredientId))
      .get();

    const [inserted] = db.insert(restockLogs)
      .values({ ingredientId, quantityAdded, cost, supplierId: supplierId ?? null, paymentMethodId, date: now })
      .returning({ id: restockLogs.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create restock log.');
    }

    const ingredientUpdate: {
      quantity: ReturnType<typeof sql>;
      updatedAt: ReturnType<typeof sql>;
      supplierId?: string | null;
    } = {
      quantity: sql`${ingredients.quantity} + ${quantityAdded}`,
      updatedAt: sql`cast(strftime('%s', 'now') as int)`,
    };

    if (supplierId !== undefined) {
      ingredientUpdate.supplierId = supplierId ?? null;
    }

    db.update(ingredients)
      .set(ingredientUpdate)
      .where(eq(ingredients.id, ingredientId))
      .run();

    db.insert(expenses)
      .values({
        date: now,
        category: 'Reposición de inventario',
        amount: cost,
        description: ingredient ? `${ingredient.name} (${quantityAdded} ${ingredient.unit})` : null,
        supplierId: supplierId ?? null,
        paymentMethodId,
      })
      .run();

    return inserted.id;
  }
}
