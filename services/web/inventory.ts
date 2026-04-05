import type { InventoryService } from '@/services/interfaces/inventory';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, UpdateIngredientPayload } from '@/types/inventory';
import type { Unit } from '@/types/types';

import { getDb } from './storage';

export class InventoryWebService implements InventoryService {
  async getHydrationData() {
    const db = await getDb();
    const [ingredients, suppliers, restockLogs] = await Promise.all([
      db.ingredients.toArray(),
      db.suppliers.toArray(),
      db.restockLogs.toArray(),
    ]);

    return {
      ingredients: ingredients.slice().sort((left, right) => left.name.localeCompare(right.name)),
      suppliers: suppliers.slice().sort((left, right) => left.name.localeCompare(right.name)),
      restocks: restockLogs
        .slice()
        .sort((left, right) => right.date - left.date)
        .slice(0, 20)
        .map((entry) => ({
          id: entry.id,
          ingredient_name: ingredients.find((ingredient) => ingredient.id === entry.ingredientId)?.name ?? 'Desconocido',
          quantity_added: entry.quantityAdded,
          cost: entry.cost,
          date: entry.date,
        })),
    };
  }

  async addIngredient({ name, unit, quantity, lowStockThreshold, supplierId }: AddIngredientPayload): Promise<string> {
    const db = await getDb();
    const id = await db.ingredients.add({
      name,
      unit: unit as Unit,
      quantity,
      low_stock_threshold: lowStockThreshold,
      supplier_id: supplierId ?? null,
    });
    return id;
  }

  async updateIngredient({ id, ...payload }: UpdateIngredientPayload): Promise<void> {
    const db = await getDb();
    const ingredient = await db.ingredients.get(id);
    if (!ingredient) {
      return;
    }

    ingredient.name = payload.name ?? ingredient.name;
    ingredient.unit = (payload.unit as Unit | undefined) ?? ingredient.unit;
    ingredient.quantity = payload.quantity ?? ingredient.quantity;
    ingredient.low_stock_threshold = payload.low_stock_threshold ?? ingredient.low_stock_threshold;
    ingredient.supplier_id = payload.supplier_id ?? ingredient.supplier_id;

    await db.ingredients.update(id, ingredient);
  }

  async addSupplier({ name, phone, notes }: AddSupplierPayload): Promise<void> {
    const db = await getDb();
    const existing = await db.suppliers
      .where('name')
      .equals(name)
      .count();

    if (existing > 0) {
      return;
    }

    await db.suppliers.add({
      name,
      phone: phone ?? null,
      notes: notes ?? null,
    });
  }

  async addRestock({ ingredientId, quantityAdded, cost, supplierId }: AddRestockPayload): Promise<void> {
    const db = await getDb();
    const ingredient = await db.ingredients.get(ingredientId);
    if (!ingredient) {
      return;
    }

    ingredient.quantity += quantityAdded;
    await db.ingredients.update(ingredientId, ingredient);

    await db.restockLogs.add({
      ingredientId,
      quantityAdded,
      cost,
      supplierId: supplierId ?? null,
      date: Math.floor(Date.now() / 1000),
    });
  }
}