
export type RestockLog = {
  id: string;
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
  supplierId?: string;
};

export type UpdateIngredientPayload = {
  id: string;
} & Partial<{
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  supplier_id: string | null;
}>;

export type AddSupplierPayload = {
  name: string;
  phone?: string;
  notes?: string;
};

export type AddRestockPayload = {
  ingredientId: string;
  quantityAdded: number;
  cost: number;
  supplierId?: string;
};