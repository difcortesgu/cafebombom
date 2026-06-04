export type ProductDetail = {
  id: string;
  name: string;
  categoryId: string | null;
  category: string;
  price: number;
  imageUri: string | null;
  isActive: boolean;
  isCombo?: boolean;
  comboGroups?: ComboGroup[];
};

export type ComboGroup = {
  id: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  options: ComboGroupOption[];
};

export type ComboGroupOption = {
  id: string;
  productId: string;
  productName?: string;
  additionalPrice: number;
  isDefault: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type AddCategoryPayload = {
  name: string;
};

export type ProductIngredientLink = {
  id: string;
  productId: string;
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
};

export type ProductAdditionalIngredientLink = {
  id: string;
  productId: string;
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
  additionalPrice: number;
};

export type ProductAdditionalIngredientInput = {
  ingredientId: string;
  quantityUsed: number;
  additionalPrice: number;
};

export type CreateProductPayload = {
  name: string;
  categoryId?: string;
  price: number;
  imageUri?: string;
  isCombo?: boolean;
  recipe?: [ProductRecipeInput, ...ProductRecipeInput[]];
  additionalIngredients?: ProductAdditionalIngredientInput[];
  comboGroups?: CreateComboGroupInput[];
};

export type CreateComboGroupInput = {
  name: string;
  minQuantity: number;
  maxQuantity: number;
  options: CreateComboGroupOptionInput[];
};

export type CreateComboGroupOptionInput = {
  productId: string;
  additionalPrice: number;
  isDefault: boolean;
};

export type ProductRecipeInput = {
  ingredientId: string;
  quantityUsed: number;
};

export type UpdateProductPayload = {
  id: string;
  name?: string;
  categoryId?: string | null;
  price?: number;
  imageUri?: string | null;
  isActive?: boolean;
};

export type SetProductIngredientPayload = {
  productId: string;
  ingredientId: string;
  quantityUsed: number;
};

export type SetProductAdditionalIngredientPayload = {
  productId: string;
  ingredientId: string;
  quantityUsed: number;
  additionalPrice: number;
};

export type RemoveProductIngredientPayload = {
  productId: string;
  ingredientId: string;
};

export type RemoveProductAdditionalIngredientPayload = {
  productId: string;
  ingredientId: string;
};


