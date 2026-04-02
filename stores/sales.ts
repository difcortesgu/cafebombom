import { create } from 'zustand';

import { salesService } from '@/services';
import type { CreateSalePayload, SaleItemDetail } from '@/types/sales';
import type { Product, Sale } from '@/types/types';

type SalesState = {
  products: Product[];
  sales: Sale[];
  saleItemsById: Record<number, SaleItemDetail[]>;
  loading: boolean;
  hydrate: () => Promise<void>;
  createSale: (payload: CreateSalePayload) => Promise<void>;
  getTodayRevenue: () => number;
  getTopSelling: (limit?: number) => Promise<Array<{ name: string; quantity: number }>>;
};

export const useSalesStore = create<SalesState>((set, get) => ({
  products: [],
  sales: [],
  saleItemsById: {},
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { products, sales } = await salesService.getHydrationData();
    set({ products, sales, loading: false });
  },

  createSale: async ({ staffId, items }: CreateSalePayload) => {
    await salesService.createSale({ staffId, items });
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
