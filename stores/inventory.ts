import { create } from 'zustand';

import { inventoryService } from '@/services';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, RestockLog, UpdateIngredientPayload } from '@/types/inventory';
import type { Ingredient, Supplier } from '@/types/types';

type InventoryState = {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  restocks: RestockLog[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addIngredient: (payload: AddIngredientPayload) => Promise<string>;
  updateIngredient: (payload: UpdateIngredientPayload) => Promise<void>;
  addSupplier: (payload: AddSupplierPayload) => Promise<void>;
  addRestock: (payload: AddRestockPayload) => Promise<void>;
  lowStockCount: () => number;
  getLowStockItems: (limit?: number) => Ingredient[];
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ingredients: [],
  suppliers: [],
  restocks: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { ingredients, suppliers, restocks } = await inventoryService.getHydrationData();

    set({ ingredients, suppliers, restocks, loading: false });
  },

  addIngredient: async ({
    name,
    unit,
    quantity,
    lowStockThreshold,
    supplierId,
  }: AddIngredientPayload) => {
    const ingredientId = await inventoryService.addIngredient({ name, unit, quantity, lowStockThreshold, supplierId });
    await get().hydrate();
    return ingredientId;
  },

  updateIngredient: async ({ id, ...payload }: UpdateIngredientPayload) => {
    await inventoryService.updateIngredient({ id, ...payload });
    await get().hydrate();
  },

  addSupplier: async ({ name, phone, notes }: AddSupplierPayload) => {
    await inventoryService.addSupplier({ name, phone, notes });
    await get().hydrate();
  },

  addRestock: async ({
    ingredientId,
    quantityAdded,
    cost,
    supplierId,
  }: AddRestockPayload) => {
    await inventoryService.addRestock({ ingredientId, quantityAdded, cost, supplierId });

    await get().hydrate();
  },

  lowStockCount: () =>
    get().ingredients.filter((item: Ingredient) => Number(item.quantity) <= Number(item.low_stock_threshold)).length,

  getLowStockItems: (limit = 5) =>
    get()
      .ingredients
      .filter((item: Ingredient) => Number(item.quantity) <= Number(item.low_stock_threshold))
      .sort((left, right) => {
        const leftRatio = Number(left.low_stock_threshold) > 0 ? Number(left.quantity) / Number(left.low_stock_threshold) : Number(left.quantity);
        const rightRatio = Number(right.low_stock_threshold) > 0 ? Number(right.quantity) / Number(right.low_stock_threshold) : Number(right.quantity);

        return leftRatio - rightRatio || Number(left.quantity) - Number(right.quantity);
      })
      .slice(0, limit),
}));
