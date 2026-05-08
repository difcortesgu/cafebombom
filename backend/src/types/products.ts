export type ProductDetail = {
  id: string;
  name: string;
  categoryId: string | null;
  category: string;
  price: number;
  imageUri: string | null;
  isActive: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type ProductIngredientLink = {
  id: string;
  productId: string;
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
};

export type CreateProductPayload = {
  name: string;
  categoryId?: string;
  price: number;
  imageUri?: string;
  recipe: [ProductRecipeInput, ...ProductRecipeInput[]];
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

export type RemoveProductIngredientPayload = {
  productId: string;
  ingredientId: string;
};


