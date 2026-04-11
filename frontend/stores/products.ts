import { create } from 'zustand';

import { productsService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import { useSalesStore } from '@/stores/sales';
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

async function syncRelatedStores() {
  await Promise.all([useSalesStore.getState().hydrate(), useInventoryStore.getState().hydrate()]);
}

type ProductsState = {
  categories: CategoryOption[];
  products: ProductDetail[];
  productIngredients: ProductIngredientLink[];
  compositions: IngredientCompositionLink[];
  loading: boolean;
  hydrate: () => Promise<void>;
  createProduct: (payload: CreateProductPayload) => Promise<void>;
  updateProduct: (payload: UpdateProductPayload) => Promise<void>;
  setProductIngredient: (payload: SetProductIngredientPayload) => Promise<void>;
  removeProductIngredient: (payload: RemoveProductIngredientPayload) => Promise<void>;
  setComposition: (payload: SetCompositionPayload) => Promise<void>;
  removeComposition: (payload: RemoveCompositionPayload) => Promise<void>;
};

export const useProductsStore = create<ProductsState>((set, get) => ({
  categories: [],
  products: [],
  productIngredients: [],
  compositions: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { categories, products, productIngredients, compositions } = await productsService.getHydrationData();
    set({ categories, products, productIngredients, compositions, loading: false });
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

  setComposition: async (payload) => {
    await productsService.setComposition(payload);
    await Promise.all([get().hydrate(), syncRelatedStores()]);
  },

  removeComposition: async (payload) => {
    await productsService.removeComposition(payload);
    await Promise.all([get().hydrate(), syncRelatedStores()]);
  },
}));
