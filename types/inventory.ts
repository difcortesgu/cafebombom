
export type RestockLog = {
  id: number;
  ingredient_name: string;
  quantity_added: number;
  cost: number;
  date: number;
};

export type AddIngredientPayload = {
  name: string;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  supplierId?: number;
};

export type UpdateIngredientPayload = {
  id: number;
} & Partial<{
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  supplier_id: number | null;
}>;

export type AddSupplierPayload = {
  name: string;
  phone?: string;
  notes?: string;
};

export type AddRestockPayload = {
  ingredientId: number;
  quantityAdded: number;
  cost: number;
  supplierId?: number;
};