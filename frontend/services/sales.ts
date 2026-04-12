import type {
  AddItemToOrderPayload,
  CreateDiscountPayload,
  CreateSalePayload,
  CreateTablePayload,
  DashboardSalesSummary,
  DashboardTrendBucket,
  RemoveItemFromOrderPayload,
  SaleItemDetail,
  SalePricingSummary,
  UpdateDiscountPayload,
  UpdateDraftOrderPayload,
  UpdateTablePayload,
} from '@/types/sales';
import type { Discount, PaymentMethod, Product, RestaurantTable, Sale } from '@/types/types';
import { apiClient } from './api-client';

export type SalesHydrationData = {
  products: Product[];
  sales: Sale[];
  tables: RestaurantTable[];
  discounts: Discount[];
};

export type OrderTypeSurchargeConfig = {
  toGoSurcharge: number;
  deliverySurcharge: number;
};

export class SalesService {
  async getHydrationData(): Promise<SalesHydrationData> {
    const response = await apiClient.get<SalesHydrationData>('/sales');
    return response || { products: [], sales: [], tables: [], discounts: [] };
  }

  async getDiscounts(): Promise<Discount[]> {
    const response = await apiClient.get<{ discounts: Discount[] }>('/sales/discounts');
    return response.discounts || [];
  }

  async createDiscount(payload: CreateDiscountPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/sales/discounts', payload);
    return response.id || '';
  }

  async updateDiscount(payload: UpdateDiscountPayload): Promise<void> {
    await apiClient.put(`/sales/discounts/${payload.id}`, payload);
  }

  async deleteDiscount(id: string): Promise<void> {
    await apiClient.delete(`/sales/discounts/${id}`);
  }

  async getTables(): Promise<RestaurantTable[]> {
    const response = await apiClient.get<{ tables: RestaurantTable[] }>('/sales/tables');
    return response.tables || [];
  }

  async createTable(payload: CreateTablePayload): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>('/sales/tables', payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  async updateTable(payload: UpdateTablePayload): Promise<void> {
    await apiClient.put(`/sales/tables/${payload.id}`, payload);
  }

  async deleteTable(id: string): Promise<void> {
    await apiClient.delete(`/sales/tables/${id}`);
  }

  async createSale(payload: CreateSalePayload): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>('/sales', payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  async updateDraftOrder(payload: UpdateDraftOrderPayload): Promise<void> {
    await apiClient.put(`/sales/${payload.orderId}`, payload);
  }

  async getTopSelling(limit: number = 10): Promise<Array<{ name: string; quantity: number }>> {
    const response = await apiClient.get<{ products: Array<{ name: string; quantity: number }> }>(
      `/sales/analytics/top-selling?limit=${limit}`
    );
    return response.products || [];
  }

  async getSaleItems(saleId: string): Promise<SaleItemDetail[]> {
    const response = await apiClient.get<{ items: SaleItemDetail[] }>(`/sales/${saleId}/items`);
    return response.items || [];
  }

  async getSalePricingSummary(saleId: string): Promise<SalePricingSummary | null> {
    try {
      const response = await apiClient.get<SalePricingSummary>(`/sales/${saleId}/pricing`);
      return response || null;
    } catch {
      return null;
    }
  }

  async getRevenueInRange(startUnix: number, endUnix: number): Promise<number> {
    const response = await apiClient.get<{ revenue: number }>(
      `/sales/analytics/revenue?start=${startUnix}&end=${endUnix}`
    );
    return response.revenue || 0;
  }

  async getDashboardSummary(
    startUnix: number,
    endUnix: number,
    bucket?: DashboardTrendBucket
  ): Promise<DashboardSalesSummary> {
    const params = new URLSearchParams({
      start: String(startUnix),
      end: String(endUnix),
      ...(bucket && { bucket }),
    });

    const response = await apiClient.get<DashboardSalesSummary>(
      `/sales/analytics/dashboard?${params.toString()}`
    );
    return response || ({} as DashboardSalesSummary);
  }

  async getOrderTypeSurchargeConfig(): Promise<OrderTypeSurchargeConfig> {
    const response = await apiClient.get<OrderTypeSurchargeConfig>('/sales/surcharge-config');
    return response || { toGoSurcharge: 0, deliverySurcharge: 0 };
  }

  async saveOrderTypeSurchargeConfig(payload: OrderTypeSurchargeConfig): Promise<void> {
    await apiClient.put('/sales/surcharge-config', payload);
  }

  async sendToKitchen(orderId: string): Promise<void> {
    await apiClient.post(`/sales/${orderId}/send-to-kitchen`, {});
  }

  async markOrderReady(orderId: string): Promise<void> {
    await apiClient.post(`/sales/${orderId}/mark-ready`, {});
  }

  async markOrderPaid(orderId: string, paymentMethod: PaymentMethod): Promise<void> {
    await apiClient.post(`/sales/${orderId}/mark-paid`, { paymentMethod });
  }

  async addItemToOrder(payload: AddItemToOrderPayload): Promise<string> {
    const response = await apiClient.post<{ itemId: string }>(
      `/sales/${payload.orderId}/items`,
      payload
    );
    return response.itemId || '';
  }

  async removeItemFromOrder(payload: RemoveItemFromOrderPayload): Promise<void> {
    await apiClient.delete(`/sales/${payload.orderId}/items/${payload.saleItemId}`);
  }

  async cancelOrder(orderId: string): Promise<void> {
    await apiClient.post(`/sales/${orderId}/cancel`, {});
  }
}
