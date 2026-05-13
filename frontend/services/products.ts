import type {
  CategoryOption,
  CreateProductPayload,
  ProductAdditionalIngredientLink,
  ProductDetail,
  ProductIngredientLink,
  RemoveProductAdditionalIngredientPayload,
  RemoveProductIngredientPayload,
  SetProductAdditionalIngredientPayload,
  SetProductIngredientPayload,
  UpdateProductPayload,
} from '@/types/products';
import { apiClient } from './api-client';

export type ProductsHydrationData = {
  categories: CategoryOption[];
  products: ProductDetail[];
  productIngredients: ProductIngredientLink[];
  productAdditionalIngredients: ProductAdditionalIngredientLink[];
};

export class ProductsService {
  async getHydrationData(): Promise<ProductsHydrationData> {
    const response = await apiClient.get<ProductsHydrationData>('/products');
    return response || {
      categories: [],
      products: [],
      productIngredients: [],
      productAdditionalIngredients: [],
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
    await apiClient.put(`/products/${payload.productId}/ingredients/${payload.ingredientId}`, payload);
  }

  async removeProductIngredient(payload: RemoveProductIngredientPayload): Promise<void> {
    await apiClient.delete(`/products/${payload.productId}/ingredients/${payload.ingredientId}`);
  }

  async setProductAdditionalIngredient(payload: SetProductAdditionalIngredientPayload): Promise<void> {
    await apiClient.put(`/products/${payload.productId}/additional-ingredients/${payload.ingredientId}`, payload);
  }

  async removeProductAdditionalIngredient(payload: RemoveProductAdditionalIngredientPayload): Promise<void> {
    await apiClient.delete(`/products/${payload.productId}/additional-ingredients/${payload.ingredientId}`);
  }
}
