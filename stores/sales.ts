import { create } from 'zustand';

import { salesService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import type { CreateSalePayload, SaleItemDetail } from '@/types/sales';
import type { Product, RestaurantTable, Sale } from '@/types/types';

type SalesState = {
  products: Product[];
  sales: Sale[];
  tables: RestaurantTable[];
  saleItemsById: Record<string, SaleItemDetail[]>;
  loading: boolean;
  hydrate: () => Promise<void>;
  createSale: (payload: CreateSalePayload) => Promise<void>;
  createTable: (name: string) => Promise<void>;
  updateTable: (id: string, name: string) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  getTodayRevenue: () => number;
  getTopSelling: (limit?: number) => Promise<Array<{ name: string; quantity: number }>>;
};

export const useSalesStore = create<SalesState>((set, get) => ({
  products: [],
  sales: [],
  tables: [],
  saleItemsById: {},
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { products, sales, tables } = await salesService.getHydrationData();
    set({ products, sales, tables, loading: false });
  },

  createSale: async ({ staffId, items, tableId }: CreateSalePayload) => {
    await salesService.createSale({ staffId, items, tableId });
    await Promise.all([get().hydrate(), useInventoryStore.getState().hydrate()]);
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
}));
