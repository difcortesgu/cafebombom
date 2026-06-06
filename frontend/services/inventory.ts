import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, AddUnitPayload, DeleteUnitPayload, InventoryUnit, RestockLog, UpdateIngredientPayload, UpdateSupplierPayload } from '@/types/inventory';
import type { Ingredient, Supplier } from '@/types/types';
import { apiClient } from './api-client';

export type InventoryHydrationData = {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  restocks: RestockLog[];
  units: InventoryUnit[];
};

export class InventoryService {
  async getHydrationData(): Promise<InventoryHydrationData> {
    const response = await apiClient.get<InventoryHydrationData>('/inventory');
    return response || {
      ingredients: [],
      suppliers: [],
      restocks: [],
      units: [],
    };
  }

  async addIngredient(payload: AddIngredientPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/inventory/ingredients', payload);
    return response.id || '';
  }

  async updateIngredient(payload: UpdateIngredientPayload): Promise<void> {
    await apiClient.put(`/inventory/ingredients/${payload.id}`, payload);
  }

  async deleteIngredient(id: string): Promise<void> {
    await apiClient.delete(`/inventory/ingredients/${id}`);
  }

  /** Enable/disable an ingredient. Throws if disabling while products depend on it. */
  async setIngredientActive(id: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/inventory/ingredients/${id}/active`, { isActive });
  }

  async addSupplier(payload: AddSupplierPayload): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>('/inventory/suppliers', payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  async updateSupplier(payload: UpdateSupplierPayload): Promise<void> {
    await apiClient.put(`/inventory/suppliers/${payload.id}`, payload);
  }

  async deleteSupplier(id: string): Promise<void> {
    await apiClient.delete(`/inventory/suppliers/${id}`);
  }

  async setSupplierActive(id: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/inventory/suppliers/${id}/active`, { isActive });
  }

  async addRestock(payload: AddRestockPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/inventory/restocks', payload);
    return response.id || '';
  }

  async addUnit(payload: AddUnitPayload): Promise<InventoryUnit | null> {
    try {
      const response = await apiClient.post<InventoryUnit>('/inventory/units', payload);
      return response || null;
    } catch {
      return null;
    }
  }

  async deleteUnit({ id }: DeleteUnitPayload): Promise<string | null> {
    try {
      await apiClient.delete<void>(`/inventory/units/${id}`);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return 'No se pudo eliminar la unidad.';
    }
  }
}
