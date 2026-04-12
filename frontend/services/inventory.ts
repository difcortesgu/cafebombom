import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, RestockLog, UpdateIngredientPayload } from '@/types/inventory';
import type { Ingredient, Supplier } from '@/types/types';
import { apiClient } from './api-client';

export type InventoryHydrationData = {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  restocks: RestockLog[];
};

export class InventoryService {
  async getHydrationData(): Promise<InventoryHydrationData> {
    const response = await apiClient.get<InventoryHydrationData>('/inventory');
    return response || {
      ingredients: [],
      suppliers: [],
      restocks: [],
    };
  }

  async addIngredient(payload: AddIngredientPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/inventory/ingredients', payload);
    return response.id || '';
  }

  async updateIngredient(payload: UpdateIngredientPayload): Promise<void> {
    await apiClient.put(`/inventory/ingredients/${payload.id}`, payload);
  }

  async addSupplier(payload: AddSupplierPayload): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>('/inventory/suppliers', payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  async addRestock(payload: AddRestockPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/inventory/restocks', payload);
    return response.id || '';
  }
}
