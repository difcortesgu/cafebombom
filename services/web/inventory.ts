import type { InventoryService } from '@/services/interfaces/inventory';
import type { AddIngredientPayload, AddRestockPayload, AddSupplierPayload, UpdateIngredientPayload } from '@/types/inventory';
import type { Unit } from '@/types/types';

import { nextId, readWebData, updateWebData } from './storage';

export class InventoryWebService implements InventoryService {
  async getHydrationData() {
    const data = readWebData();

    return {
      ingredients: data.ingredients.slice().sort((left, right) => left.name.localeCompare(right.name)),
      suppliers: data.suppliers.slice().sort((left, right) => left.name.localeCompare(right.name)),
      restocks: data.restockLogs
        .slice()
        .sort((left, right) => right.date - left.date)
        .slice(0, 20)
        .map((entry) => ({
          id: entry.id,
          ingredient_name: data.ingredients.find((ingredient) => ingredient.id === entry.ingredientId)?.name ?? 'Unknown',
          quantity_added: entry.quantityAdded,
          cost: entry.cost,
          date: entry.date,
        })),
    };
  }

  async addIngredient({ name, unit, quantity, lowStockThreshold, supplierId }: AddIngredientPayload): Promise<void> {
    updateWebData((data) => {
      data.ingredients.push({
        id: nextId(data, 'ingredients'),
        name,
        unit: unit as Unit,
        quantity,
        low_stock_threshold: lowStockThreshold,
        supplier_id: supplierId ?? null,
      });
    });
  }

  async updateIngredient({ id, ...payload }: UpdateIngredientPayload): Promise<void> {
    updateWebData((data) => {
      const ingredient = data.ingredients.find((entry) => entry.id === id);
      if (!ingredient) {
        return;
      }

      ingredient.name = payload.name ?? ingredient.name;
      ingredient.unit = (payload.unit as Unit | undefined) ?? ingredient.unit;
      ingredient.quantity = payload.quantity ?? ingredient.quantity;
      ingredient.low_stock_threshold = payload.low_stock_threshold ?? ingredient.low_stock_threshold;
      ingredient.supplier_id = payload.supplier_id ?? ingredient.supplier_id;
    });
  }

  async addSupplier({ name, phone, notes }: AddSupplierPayload): Promise<void> {
    updateWebData((data) => {
      if (data.suppliers.some((supplier) => supplier.name === name)) {
        return;
      }

      data.suppliers.push({
        id: nextId(data, 'suppliers'),
        name,
        phone: phone ?? null,
        notes: notes ?? null,
      });
    });
  }

  async addRestock({ ingredientId, quantityAdded, cost, supplierId }: AddRestockPayload): Promise<void> {
    updateWebData((data) => {
      const ingredient = data.ingredients.find((entry) => entry.id === ingredientId);
      if (!ingredient) {
        return;
      }

      ingredient.quantity += quantityAdded;
      data.restockLogs.push({
        id: nextId(data, 'restockLogs'),
        ingredientId,
        quantityAdded,
        cost,
        supplierId: supplierId ?? null,
        date: Math.floor(Date.now() / 1000),
      });
    });
  }
}