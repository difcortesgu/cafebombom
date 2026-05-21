import { create } from 'zustand';

import { productsService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import { useSalesStore } from '@/stores/sales';
import type {
  AddCategoryPayload,
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

async function syncSalesStore() {
  await useSalesStore.getState().hydrate();
}

async function syncInventoryStore() {
  await useInventoryStore.getState().hydrate();
}

type ProductsState = {
  categories: CategoryOption[];
  products: ProductDetail[];
  productIngredients: ProductIngredientLink[];
  productAdditionalIngredients: ProductAdditionalIngredientLink[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addCategory: (payload: AddCategoryPayload) => Promise<string | null>;
  createProduct: (payload: CreateProductPayload) => Promise<void>;
  updateProduct: (payload: UpdateProductPayload) => Promise<void>;
  setProductIngredient: (payload: SetProductIngredientPayload) => Promise<void>;
  removeProductIngredient: (payload: RemoveProductIngredientPayload) => Promise<void>;
  setProductAdditionalIngredient: (payload: SetProductAdditionalIngredientPayload) => Promise<void>;
  removeProductAdditionalIngredient: (payload: RemoveProductAdditionalIngredientPayload) => Promise<void>;
};

export const useProductsStore = create<ProductsState>((set, get) => ({
  categories: [],
  products: [],
  productIngredients: [],
  productAdditionalIngredients: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { categories, products, productIngredients, productAdditionalIngredients } = await productsService.getHydrationData();
    set({ categories, products, productIngredients, productAdditionalIngredients, loading: false });
  },

  addCategory: async (payload) => {
    const categoryId = await productsService.addCategory(payload);
    await get().hydrate();
    return categoryId;
  },

  createProduct: async (payload) => {
    await productsService.createProduct(payload);
    await Promise.all([get().hydrate(), syncSalesStore()]);
  },

  updateProduct: async (payload) => {
    await productsService.updateProduct(payload);
    await Promise.all([get().hydrate(), syncSalesStore()]);
  },

  setProductIngredient: async (payload) => {
    await productsService.setProductIngredient(payload);
    await Promise.all([get().hydrate(), syncInventoryStore()]);
  },

  removeProductIngredient: async (payload) => {
    await productsService.removeProductIngredient(payload);
    await Promise.all([get().hydrate(), syncInventoryStore()]);
  },

  setProductAdditionalIngredient: async (payload) => {
    await productsService.setProductAdditionalIngredient(payload);
    await Promise.all([get().hydrate(), syncInventoryStore()]);
  },

  removeProductAdditionalIngredient: async (payload) => {
    await productsService.removeProductAdditionalIngredient(payload);
    await Promise.all([get().hydrate(), syncInventoryStore()]);
  },
}));
