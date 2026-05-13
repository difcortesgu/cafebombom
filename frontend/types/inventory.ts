
import type { IngredientUnit, Unit } from '@/types/types';

export type InventoryUnit = IngredientUnit;

export type RestockLog = {
  id: string;
  ingredient_name: string;
  quantity_added: number;
  cost: number;
  date: number;
};

export type AddIngredientPayload = {
  name: string;
  unit: Unit;
  lowStockThreshold: number;
  supplierId?: string;
};

export type UpdateIngredientPayload = {
  id: string;
} & Partial<{
  name: string;
  unit: Unit;
  low_stock_threshold: number;
  supplier_id: string | null;
}>;

export type AddSupplierPayload = {
  name: string;
  phone?: string;
  notes?: string;
};

export type AddUnitPayload = {
  name: string;
};

export type DeleteUnitPayload = {
  id: string;
};

export type AddRestockPayload = {
  ingredientId: string;
  quantityAdded: number;
  cost: number;
  supplierId?: string;
};