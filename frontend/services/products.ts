import type {
  AddCategoryPayload,
  CategoryOption,
  ComboGroup,
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
import { normalizeAssetUrl } from './setup';

export type ProductsHydrationData = {
  categories: CategoryOption[];
  products: ProductDetail[];
  productIngredients: ProductIngredientLink[];
  productAdditionalIngredients: ProductAdditionalIngredientLink[];
  comboGroups?: any[];
  comboGroupOptions?: any[];
};

export class ProductsService {
  async getHydrationData(): Promise<ProductsHydrationData> {
    const response = await apiClient.get<ProductsHydrationData>('/products');
    return response || {
      categories: [],
      products: [],
      productIngredients: [],
      productAdditionalIngredients: [],
      comboGroups: [],
      comboGroupOptions: [],
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

  async addCategory(payload: AddCategoryPayload): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>('/products/categories', payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  /** Uploads a picked image to the server and returns a stable, renderable URL. */
  async uploadProductImage(content: Uint8Array, fileName = 'image.jpg'): Promise<string> {
    const response = await apiClient.uploadFile<{ imageId: string; version: string; imageUrl: string }>(
      '/products/images',
      content,
      fileName,
    );
    return normalizeAssetUrl(response.imageUrl) ?? response.imageUrl;
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

  async setComboGroup(productId: string, payload: { name: string; minQuantity: number; maxQuantity: number }): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>(`/products/${productId}/combo-groups`, payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  async removeComboGroup(productId: string, groupId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/combo-groups/${groupId}`);
  }

  async setComboGroupOption(productId: string, groupId: string, payload: { productId: string; additionalPrice: number; isDefault: boolean }): Promise<void> {
    await apiClient.post(`/products/${productId}/combo-groups/${groupId}/options`, payload);
  }

  async removeComboGroupOption(productId: string, groupId: string, optionProductId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/combo-groups/${groupId}/options/${optionProductId}`);
  }
}
