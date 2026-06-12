import { create } from 'zustand';

import { inventoryService } from '@/services';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, AddUnitPayload, DeleteUnitPayload, InventoryUnit, RestockLog, UpdateIngredientPayload, UpdateSupplierPayload } from '@/types/inventory';
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
  deleteIngredient: (id: string) => Promise<void>;
  setIngredientActive: (id: string, isActive: boolean) => Promise<void>;
  addSupplier: (payload: AddSupplierPayload) => Promise<string>;
  updateSupplier: (payload: UpdateSupplierPayload) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  setSupplierActive: (id: string, isActive: boolean) => Promise<void>;
  addUnit: (payload: AddUnitPayload) => Promise<InventoryUnit>;
  deleteUnit: (payload: DeleteUnitPayload) => Promise<void>;
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

  deleteIngredient: async (id: string) => {
    await inventoryService.deleteIngredient(id);
    await get().hydrate();
  },

  setIngredientActive: async (id: string, isActive: boolean) => {
    await inventoryService.setIngredientActive(id, isActive);
    await get().hydrate();
  },

  addSupplier: async ({ name, phone, notes }: AddSupplierPayload) => {
    const supplierId = await inventoryService.addSupplier({ name, phone, notes });
    await get().hydrate();
    return supplierId;
  },

  updateSupplier: async (payload: UpdateSupplierPayload) => {
    await inventoryService.updateSupplier(payload);
    await get().hydrate();
  },

  deleteSupplier: async (id: string) => {
    await inventoryService.deleteSupplier(id);
    await get().hydrate();
  },

  setSupplierActive: async (id: string, isActive: boolean) => {
    await inventoryService.setSupplierActive(id, isActive);
    await get().hydrate();
  },

  addUnit: async ({ name }: AddUnitPayload) => {
    const unit = await inventoryService.addUnit({ name });
    await get().hydrate();
    return unit;
  },

  deleteUnit: async ({ id }: DeleteUnitPayload) => {
    await inventoryService.deleteUnit({ id });
    await get().hydrate();
  },

  addRestock: async ({
    ingredientId,
    quantityAdded,
    cost,
    supplierId,
    paymentMethodId,
  }: AddRestockPayload) => {
    await inventoryService.addRestock({ ingredientId, quantityAdded, cost, supplierId, paymentMethodId });

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
