import { create } from 'zustand';

import { productsService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import { useSalesStore } from '@/stores/sales';
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
  comboGroups: any[];
  comboGroupOptions: any[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addCategory: (payload: AddCategoryPayload) => Promise<string | null>;
  createProduct: (payload: CreateProductPayload) => Promise<string | null>;
  updateProduct: (payload: UpdateProductPayload) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setProductActive: (id: string, isActive: boolean) => Promise<void>;
  setProductIngredient: (payload: SetProductIngredientPayload) => Promise<void>;
  removeProductIngredient: (payload: RemoveProductIngredientPayload) => Promise<void>;
  setProductAdditionalIngredient: (payload: SetProductAdditionalIngredientPayload) => Promise<void>;
  removeProductAdditionalIngredient: (payload: RemoveProductAdditionalIngredientPayload) => Promise<void>;
  setComboGroup: (productId: string, payload: { name: string; minQuantity: number; maxQuantity: number }) => Promise<string | null>;
  removeComboGroup: (productId: string, groupId: string) => Promise<void>;
  setComboGroupOption: (productId: string, groupId: string, payload: { productId: string; additionalPrice: number; isDefault: boolean }) => Promise<void>;
  removeComboGroupOption: (productId: string, groupId: string, optionProductId: string) => Promise<void>;
};

export const useProductsStore = create<ProductsState>((set, get) => ({
  categories: [],
  products: [],
  productIngredients: [],
  productAdditionalIngredients: [],
  comboGroups: [],
  comboGroupOptions: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const hydrationData = await productsService.getHydrationData();
    const { categories, products, productIngredients, productAdditionalIngredients, comboGroups = [], comboGroupOptions = [] } = hydrationData;

    // Build combo structure: nest comboGroupOptions into comboGroups, and comboGroups into products
    const comboGroupsByComboId = new Map<string, ComboGroup[]>();
    const comboOptionsByGroupId = new Map<string, any[]>();

    comboGroupOptions.forEach((opt) => {
      const groupOptions = comboOptionsByGroupId.get(opt.groupId) ?? [];
      groupOptions.push(opt);
      comboOptionsByGroupId.set(opt.groupId, groupOptions);
    });

    comboGroups.forEach((group) => {
      const groupWithOptions = {
        ...group,
        options: comboOptionsByGroupId.get(group.id) ?? [],
      };
      const productGroups = comboGroupsByComboId.get(group.comboProductId) ?? [];
      productGroups.push(groupWithOptions);
      comboGroupsByComboId.set(group.comboProductId, productGroups);
    });

    const productsWithCombos = products.map((product) => ({
      ...product,
      comboGroups: comboGroupsByComboId.get(product.id) ?? [],
    }));

    set({
      categories,
      products: productsWithCombos,
      productIngredients,
      productAdditionalIngredients,
      comboGroups,
      comboGroupOptions,
      loading: false,
    });
  },

  addCategory: async (payload) => {
    const categoryId = await productsService.addCategory(payload);
    await get().hydrate();
    return categoryId;
  },

  createProduct: async (payload) => {
    const productId = await productsService.createProduct(payload);
    await Promise.all([get().hydrate(), syncSalesStore()]);
    return productId;
  },

  updateProduct: async (payload) => {
    await productsService.updateProduct(payload);
    await Promise.all([get().hydrate(), syncSalesStore()]);
  },

  deleteProduct: async (id) => {
    await productsService.deleteProduct(id);
    await Promise.all([get().hydrate(), syncSalesStore()]);
  },

  setProductActive: async (id, isActive) => {
    await productsService.setProductActive(id, isActive);
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

  setComboGroup: async (productId, payload) => {
    const groupId = await productsService.setComboGroup(productId, payload);
    await get().hydrate();
    return groupId;
  },

  removeComboGroup: async (productId, groupId) => {
    await productsService.removeComboGroup(productId, groupId);
    await get().hydrate();
  },

  setComboGroupOption: async (productId, groupId, payload) => {
    await productsService.setComboGroupOption(productId, groupId, payload);
    await get().hydrate();
  },

  removeComboGroupOption: async (productId, groupId, optionProductId) => {
    await productsService.removeComboGroupOption(productId, groupId, optionProductId);
    await get().hydrate();
  },
}));
