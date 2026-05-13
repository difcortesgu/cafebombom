import { create } from 'zustand';

import { inventoryService } from '@/services';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, AddUnitPayload, DeleteUnitPayload, InventoryUnit, RestockLog, UpdateIngredientPayload } from '@/types/inventory';
import type { Ingredient, Supplier } from '@/types/types';

type InventoryState = {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  restocks: RestockLog[];
  units: InventoryUnit[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addIngredient: (payload: AddIngredientPayload) => Promise<string>;
  updateIngredient: (payload: UpdateIngredientPayload) => Promise<void>;
  addSupplier: (payload: AddSupplierPayload) => Promise<string | null>;
  addUnit: (payload: AddUnitPayload) => Promise<InventoryUnit | null>;
  deleteUnit: (payload: DeleteUnitPayload) => Promise<string | null>;
  addRestock: (payload: AddRestockPayload) => Promise<void>;
  lowStockCount: () => number;
  getLowStockItems: (limit?: number) => Ingredient[];
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ingredients: [],
  suppliers: [],
  restocks: [],
  units: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { ingredients, suppliers, restocks, units } = await inventoryService.getHydrationData();

    set({ ingredients, suppliers, restocks, units, loading: false });
  },

  addIngredient: async ({
    name,
    unit,
    lowStockThreshold,
    supplierId,
  }: AddIngredientPayload) => {
    const ingredientId = await inventoryService.addIngredient({ name, unit, lowStockThreshold, supplierId });
    await get().hydrate();
    return ingredientId;
  },

  updateIngredient: async ({ id, ...payload }: UpdateIngredientPayload) => {
    await inventoryService.updateIngredient({ id, ...payload });
    await get().hydrate();
  },

  addSupplier: async ({ name, phone, notes }: AddSupplierPayload) => {
    const supplierId = await inventoryService.addSupplier({ name, phone, notes });
    await get().hydrate();
    return supplierId;
  },

  addUnit: async ({ name }: AddUnitPayload) => {
    const unit = await inventoryService.addUnit({ name });
    await get().hydrate();
    return unit;
  },

  deleteUnit: async ({ id }: DeleteUnitPayload) => {
    const error = await inventoryService.deleteUnit({ id });
    await get().hydrate();
    return error;
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
