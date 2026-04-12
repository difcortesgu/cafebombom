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
import { apiClient } from './api-client';

export type ProductsHydrationData = {
  categories: CategoryOption[];
  products: ProductDetail[];
  productIngredients: ProductIngredientLink[];
  compositions: IngredientCompositionLink[];
};

export class ProductsService {
  async getHydrationData(): Promise<ProductsHydrationData> {
    const response = await apiClient.get<ProductsHydrationData>('/products');
    return response || {
      categories: [],
      products: [],
      productIngredients: [],
      compositions: [],
    };
  }

  async createProduct(payload: CreateProductPayload): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>('/products', payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  async updateProduct(payload: UpdateProductPayload): Promise<void> {
    await apiClient.put(`/products/${payload.id}`, payload);
  }

  async setProductIngredient(payload: SetProductIngredientPayload): Promise<void> {
    await apiClient.post(`/products/${payload.productId}/ingredients`, payload);
  }

  async removeProductIngredient(payload: RemoveProductIngredientPayload): Promise<void> {
    await apiClient.delete(`/products/${payload.productId}/ingredients/${payload.ingredientId}`);
  }

  async setComposition(payload: SetCompositionPayload): Promise<void> {
    await apiClient.post(`/products/${payload.productId}/composition`, payload);
  }

  async removeComposition(payload: RemoveCompositionPayload): Promise<void> {
    await apiClient.delete(`/products/${payload.productId}/composition/${payload.ingredientId}`);
  }
}
