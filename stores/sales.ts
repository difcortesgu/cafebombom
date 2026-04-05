import { create } from 'zustand';

import { salesService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import type { AddItemToOrderPayload, CreateDiscountPayload, CreateSalePayload, RemoveItemFromOrderPayload, SaleItemDetail, SalePricingSummary, UpdateDiscountPayload, UpdateDraftOrderPayload } from '@/types/sales';
import type { Discount, Product, RestaurantTable, Sale, TableType } from '@/types/types';

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
  updateDraftOrder: (payload: UpdateDraftOrderPayload) => Promise<void>;
  createDiscount: (payload: CreateDiscountPayload) => Promise<void>;
  updateDiscount: (payload: UpdateDiscountPayload) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  hydrateDiscounts: () => Promise<void>;
  createTable: (payload: { name: string; tableType: TableType }) => Promise<void>;
  updateTable: (payload: { id: string; name: string; tableType: TableType }) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  getTodayRevenue: () => number;
  getTopSelling: (limit?: number) => Promise<Array<{ name: string; quantity: number }>>;
  getSalePricingSummary: (saleId: string) => Promise<SalePricingSummary | null>;
  sendToKitchen: (orderId: string) => Promise<void>;
  markOrderReady: (orderId: string) => Promise<void>;
  markOrderPaid: (orderId: string) => Promise<void>;
  addItemToOrder: (payload: AddItemToOrderPayload) => Promise<void>;
  removeItemFromOrder: (payload: RemoveItemFromOrderPayload) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  getDraftOrders: () => Sale[];
  getInProgressOrders: () => Sale[];
  getReadyOrders: () => Sale[];
  getPendingPaymentOrders: () => Sale[];
  getCompletedOrders: () => Sale[];
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

  updateDraftOrder: async (payload: UpdateDraftOrderPayload) => {
    await salesService.updateDraftOrder(payload);
    await get().hydrate();
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

  createTable: async (payload) => {
    await salesService.createTable(payload);
    await get().hydrate();
  },

  updateTable: async (payload) => {
    await salesService.updateTable(payload);
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

  sendToKitchen: async (orderId: string) => {
    await salesService.sendToKitchen(orderId);
    await Promise.all([get().hydrate(), useInventoryStore.getState().hydrate()]);
  },

  markOrderReady: async (orderId: string) => {
    await salesService.markOrderReady(orderId);
    await get().hydrate();
  },

  markOrderPaid: async (orderId: string) => {
    await salesService.markOrderPaid(orderId);
    await get().hydrate();
  },

  addItemToOrder: async (payload: AddItemToOrderPayload) => {
    await salesService.addItemToOrder(payload);
    await get().hydrate();
  },

  removeItemFromOrder: async (payload: RemoveItemFromOrderPayload) => {
    await salesService.removeItemFromOrder(payload);
    await get().hydrate();
  },

  cancelOrder: async (orderId: string) => {
    await salesService.cancelOrder(orderId);
    await Promise.all([get().hydrate(), useInventoryStore.getState().hydrate()]);
  },

  getDraftOrders: () => {
    return get().sales.filter((sale: Sale) => sale.status === 'draft');
  },

  getInProgressOrders: () => {
    return get().sales.filter((sale: Sale) => sale.status === 'in-progress');
  },

  getReadyOrders: () => {
    return get().sales.filter((sale: Sale) => sale.status === 'ready');
  },

  getPendingPaymentOrders: () => {
    return get().sales.filter((sale: Sale) => sale.status === 'ready' || sale.status === 'in-progress');
  },

  getCompletedOrders: () => {
    return get().sales.filter((sale: Sale) => sale.status === 'completed');
  },
}));
