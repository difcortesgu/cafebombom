import { create } from 'zustand';

import { salesService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import type { CreateDiscountPayload, CreateSalePayload, SaleItemDetail, SalePricingSummary, UpdateDiscountPayload } from '@/types/sales';
import type { Discount, Product, RestaurantTable, Sale } from '@/types/types';

type SalesState = {
  products: Product[];
  sales: Sale[];
  tables: RestaurantTable[];
  discounts: Discount[];
  saleItemsById: Record<string, SaleItemDetail[]>;
  salePricingById: Record<string, SalePricingSummary>;
  loading: boolean;
  hydrate: () => Promise<void>;
  createSale: (payload: CreateSalePayload) => Promise<void>;
  createDiscount: (payload: CreateDiscountPayload) => Promise<void>;
  updateDiscount: (payload: UpdateDiscountPayload) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  hydrateDiscounts: () => Promise<void>;
  createTable: (name: string) => Promise<void>;
  updateTable: (id: string, name: string) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  getTodayRevenue: () => number;
  getTopSelling: (limit?: number) => Promise<Array<{ name: string; quantity: number }>>;
  getSalePricingSummary: (saleId: string) => Promise<SalePricingSummary | null>;
};

export const useSalesStore = create<SalesState>((set, get) => ({
  products: [],
  sales: [],
  tables: [],
  discounts: [],
  saleItemsById: {},
  salePricingById: {},
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { products, sales, tables, discounts } = await salesService.getHydrationData();
    set({ products, sales, tables, discounts, loading: false });
  },

  createSale: async (payload: CreateSalePayload) => {
    await salesService.createSale(payload);
    await Promise.all([get().hydrate(), useInventoryStore.getState().hydrate()]);
  },

  createDiscount: async (payload: CreateDiscountPayload) => {
    await salesService.createDiscount(payload);
    await get().hydrateDiscounts();
  },

  updateDiscount: async (payload: UpdateDiscountPayload) => {
    await salesService.updateDiscount(payload);
    await get().hydrateDiscounts();
  },

  deleteDiscount: async (id: string) => {
    await salesService.deleteDiscount(id);
    await get().hydrateDiscounts();
  },

  hydrateDiscounts: async () => {
    const discounts = await salesService.getDiscounts();
    set({ discounts });
  },

  createTable: async (name: string) => {
    await salesService.createTable({ name });
    await get().hydrate();
  },

  updateTable: async (id: string, name: string) => {
    await salesService.updateTable({ id, name });
    await get().hydrate();
  },

  deleteTable: async (id: string) => {
    await salesService.deleteTable(id);
    await get().hydrate();
  },

  getTodayRevenue: () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const start = Math.floor(startOfDay.getTime() / 1000);
    const end = start + 24 * 60 * 60;

    return get()
      .sales.filter((sale: Sale) => sale.created_at >= start && sale.created_at < end)
      .reduce((sum: number, sale: Sale) => sum + Number(sale.total), 0);
  },

  getTopSelling: async (limit = 5) => {
    return salesService.getTopSelling(limit);
  },

  getSalePricingSummary: async (saleId: string) => {
    const cached = get().salePricingById[saleId];
    if (cached) {
      return cached;
    }

    const summary = await salesService.getSalePricingSummary(saleId);
    if (summary) {
      set((state) => ({
        salePricingById: {
          ...state.salePricingById,
          [saleId]: summary,
        },
      }));
    }

    return summary;
  },
}));
