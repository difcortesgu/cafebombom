import { create } from 'zustand';

import { execute, queryAll, queryFirst } from '@/database/db';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, RestockLog, UpdateIngredientPayload } from '@/types/inventory';
import type { Ingredient, Supplier } from '@/types/types';

type InventoryState = {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  restocks: RestockLog[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addIngredient: (payload: AddIngredientPayload) => Promise<void>;
  updateIngredient: (payload: UpdateIngredientPayload) => Promise<void>;
  addSupplier: (payload: AddSupplierPayload) => Promise<void>;
  addRestock: (payload: AddRestockPayload) => Promise<void>;
  lowStockCount: () => number;
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ingredients: [],
  suppliers: [],
  restocks: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const [ingredients, suppliers, restocks] = await Promise.all([
      queryAll<Ingredient>(
        'SELECT id, name, unit, quantity, low_stock_threshold, supplier_id FROM ingredients ORDER BY name;'
      ),
      queryAll<Supplier>('SELECT id, name, phone, notes FROM suppliers ORDER BY name;'),
      queryAll<RestockLog>(
        `SELECT r.id, i.name as ingredient_name, r.quantity_added, r.cost, r.date
         FROM restock_logs r
         JOIN ingredients i ON i.id = r.ingredient_id
         ORDER BY r.date DESC
         LIMIT 20;`
      ),
    ]);

    set({ ingredients, suppliers, restocks, loading: false });
  },

  addIngredient: async ({
    name,
    unit,
    quantity,
    lowStockThreshold,
    supplierId,
  }: AddIngredientPayload) => {
    await execute(
      `INSERT INTO ingredients (name, unit, quantity, low_stock_threshold, supplier_id)
       VALUES (?, ?, ?, ?, ?);`,
      [name, unit, quantity, lowStockThreshold, supplierId ?? null]
    );
    await get().hydrate();
  },

  updateIngredient: async ({ id, ...payload }: UpdateIngredientPayload) => {
    const existing = await queryFirst<Ingredient>(
      'SELECT id, name, unit, quantity, low_stock_threshold, supplier_id FROM ingredients WHERE id = ?;',
      [id]
    );

    if (!existing) {
      return;
    }

    await execute(
      `UPDATE ingredients
       SET name = ?,
           unit = ?,
           quantity = ?,
           low_stock_threshold = ?,
           supplier_id = ?,
           updated_at = cast(strftime('%s', 'now') as int),
           synced_at = NULL
       WHERE id = ?;`,
      [
        payload.name ?? existing.name,
        payload.unit ?? existing.unit,
        payload.quantity ?? existing.quantity,
        payload.low_stock_threshold ?? existing.low_stock_threshold,
        payload.supplier_id ?? existing.supplier_id,
        id,
      ]
    );
    await get().hydrate();
  },

  addSupplier: async ({ name, phone, notes }: AddSupplierPayload) => {
    await execute('INSERT OR IGNORE INTO suppliers (name, phone, notes) VALUES (?, ?, ?);', [
      name,
      phone ?? null,
      notes ?? null,
    ]);
    await get().hydrate();
  },

  addRestock: async ({
    ingredientId,
    quantityAdded,
    cost,
    supplierId,
  }: AddRestockPayload) => {
    const now = Math.floor(Date.now() / 1000);

    await execute(
      'INSERT INTO restock_logs (ingredient_id, quantity_added, cost, supplier_id, date) VALUES (?, ?, ?, ?, ?);',
      [ingredientId, quantityAdded, cost, supplierId ?? null, now]
    );

    await execute(
      `UPDATE ingredients
       SET quantity = quantity + ?,
           updated_at = cast(strftime('%s', 'now') as int),
           synced_at = NULL
       WHERE id = ?;`,
      [quantityAdded, ingredientId]
    );

    await get().hydrate();
  },

  lowStockCount: () =>
    get().ingredients.filter((item: Ingredient) => Number(item.quantity) <= Number(item.low_stock_threshold)).length,
}));
