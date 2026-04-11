import type {
    CategoryOption,
    CreateProductPayload,
    IngredientCompositionLink,
    ProductDetail,
    ProductIngredientLink,
    RemoveCompositionPayload,
    RemoveProductIngredientPayload,
    SetCompositionPayload,
    SetProductIngredientPayload,
    UpdateProductPayload,
} from '@/types/products';

export type ProductsHydrationData = {
  categories: CategoryOption[];
  products: ProductDetail[];
  productIngredients: ProductIngredientLink[];
  compositions: IngredientCompositionLink[];
};

export interface ProductsService {
  getHydrationData(): Promise<ProductsHydrationData>;
  createProduct(payload: CreateProductPayload): Promise<string | null>;
  updateProduct(payload: UpdateProductPayload): Promise<void>;
  setProductIngredient(payload: SetProductIngredientPayload): Promise<void>;
  removeProductIngredient(payload: RemoveProductIngredientPayload): Promise<void>;
  setComposition(payload: SetCompositionPayload): Promise<void>;
  removeComposition(payload: RemoveCompositionPayload): Promise<void>;
}
