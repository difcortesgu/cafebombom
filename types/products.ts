export type ProductDetail = {
  id: string;
  name: string;
  categoryId: string | null;
  category: string;
  price: number;
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

export type IngredientCompositionLink = {
  id: string;
  parentIngredientId: string;
  parentIngredientName: string;
  childIngredientId: string;
  childIngredientName: string;
  quantityNeeded: number;
};

export type CreateProductPayload = {
  name: string;
  categoryId?: string;
  price: number;
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

export type SetCompositionPayload = {
  parentIngredientId: string;
  childIngredientId: string;
  quantityNeeded: number;
};

export type RemoveCompositionPayload = {
  parentIngredientId: string;
  childIngredientId: string;
};
