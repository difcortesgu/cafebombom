import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, RestockLog, UpdateIngredientPayload } from '@/types/inventory';
import type { Ingredient, Supplier } from '@/types/types';

export type InventoryHydrationData = {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  restocks: RestockLog[];
};

export interface InventoryService {
  getHydrationData(): Promise<InventoryHydrationData>;
  addIngredient(payload: AddIngredientPayload): Promise<string>;
  updateIngredient(payload: UpdateIngredientPayload): Promise<void>;
  addSupplier(payload: AddSupplierPayload): Promise<void>;
  addRestock(payload: AddRestockPayload): Promise<void>;
}
