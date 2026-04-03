export type ProductDetail = {
  id: number;
  name: string;
  categoryId: number | null;
  category: string;
  price: number;
  isActive: boolean;
};

export type CategoryOption = {
  id: number;
  name: string;
};

export type ProductIngredientLink = {
  id: number;
  productId: number;
  ingredientId: number;
  ingredientName: string;
  quantityUsed: number;
};

export type IngredientCompositionLink = {
  id: number;
  parentIngredientId: number;
  parentIngredientName: string;
  childIngredientId: number;
  childIngredientName: string;
  quantityNeeded: number;
};

export type CreateProductPayload = {
  name: string;
  categoryId?: number;
  price: number;
};

export type UpdateProductPayload = {
  id: number;
  name?: string;
  categoryId?: number | null;
  price?: number;
  isActive?: boolean;
};

export type SetProductIngredientPayload = {
  productId: number;
  ingredientId: number;
  quantityUsed: number;
};

export type RemoveProductIngredientPayload = {
  productId: number;
  ingredientId: number;
};

export type SetCompositionPayload = {
  parentIngredientId: number;
  childIngredientId: number;
  quantityNeeded: number;
};

export type RemoveCompositionPayload = {
  parentIngredientId: number;
  childIngredientId: number;
};
