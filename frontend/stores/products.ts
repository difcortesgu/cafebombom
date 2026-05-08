import { create } from 'zustand';

import { productsService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import { useSalesStore } from '@/stores/sales';
import type {
  CategoryOption,
  CreateProductPayload,
  ProductDetail,
  ProductIngredientLink,
  RemoveProductIngredientPayload,
  SetProductIngredientPayload,
  UpdateProductPayload,
} from '@/types/products';

async function syncRelatedStores() {
  await Promise.all([useSalesStore.getState().hydrate(), useInventoryStore.getState().hydrate()]);
}

type ProductsState = {
  categories: CategoryOption[];
  products: ProductDetail[];
  productIngredients: ProductIngredientLink[];
  loading: boolean;
  hydrate: () => Promise<void>;
  createProduct: (payload: CreateProductPayload) => Promise<void>;
  updateProduct: (payload: UpdateProductPayload) => Promise<void>;
  setProductIngredient: (payload: SetProductIngredientPayload) => Promise<void>;
  removeProductIngredient: (payload: RemoveProductIngredientPayload) => Promise<void>;
};

export const useProductsStore = create<ProductsState>((set, get) => ({
  categories: [],
  products: [],
  productIngredients: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { categories, products, productIngredients } = await productsService.getHydrationData();
    set({ categories, products, productIngredients, loading: false });
  },

  createProduct: async (payload) => {
    await productsService.createProduct(payload);
    await Promise.all([get().hydrate(), syncRelatedStores()]);
  },

  updateProduct: async (payload) => {
    await productsService.updateProduct(payload);
    await Promise.all([get().hydrate(), syncRelatedStores()]);
  },

  setProductIngredient: async (payload) => {
    await productsService.setProductIngredient(payload);
    await Promise.all([get().hydrate(), syncRelatedStores()]);
  },

  removeProductIngredient: async (payload) => {
    await productsService.removeProductIngredient(payload);
    await Promise.all([get().hydrate(), syncRelatedStores()]);
  },
}));
