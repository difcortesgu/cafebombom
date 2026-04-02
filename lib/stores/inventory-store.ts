import { create } from 'zustand';

import { execute, queryAll, queryFirst } from '@/lib/db';
import type { Ingredient, Supplier } from '@/lib/types';

type RestockLog = {
  id: number;
  ingredient_name: string;
  quantity_added: number;
  cost: number;
  date: number;
};

type InventoryState = {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  restocks: RestockLog[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addIngredient: (payload: {
    name: string;
    unit: string;
    quantity: number;
    lowStockThreshold: number;
    supplierId?: number;
  }) => Promise<void>;
  updateIngredient: (
    id: number,
    payload: Partial<{
      name: string;
      unit: string;
      quantity: number;
      low_stock_threshold: number;
      supplier_id: number | null;
    }>
  ) => Promise<void>;
  addSupplier: (payload: { name: string; phone?: string; notes?: string }) => Promise<void>;
  addRestock: (payload: {
    ingredientId: number;
    quantityAdded: number;
    cost: number;
    supplierId?: number;
  }) => Promise<void>;
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
  }: {
    name: string;
    unit: string;
    quantity: number;
    lowStockThreshold: number;
    supplierId?: number;
  }) => {
    await execute(
      `INSERT INTO ingredients (name, unit, quantity, low_stock_threshold, supplier_id)
       VALUES (?, ?, ?, ?, ?);`,
      [name, unit, quantity, lowStockThreshold, supplierId ?? null]
    );
    await get().hydrate();
  },

  updateIngredient: async (
    id: number,
    payload: Partial<{
      name: string;
      unit: string;
      quantity: number;
      low_stock_threshold: number;
      supplier_id: number | null;
    }>
  ) => {
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

  addSupplier: async ({ name, phone, notes }: { name: string; phone?: string; notes?: string }) => {
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
  }: {
    ingredientId: number;
    quantityAdded: number;
    cost: number;
    supplierId?: number;
  }) => {
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
