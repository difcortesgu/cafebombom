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
    // Implementation goes here
    return {
      products: [],
      sales: [],
      tables: [],
      discounts: [],
    };
  }

  async getDiscounts(): Promise<Discount[]> {
    // Implementation goes here
    return [];
  }

  async createDiscount(payload: CreateDiscountPayload): Promise<string> {
    // Implementation goes here
    return '';
  }

  async updateDiscount(payload: UpdateDiscountPayload): Promise<void> {
    // Implementation goes here
  }

  async deleteDiscount(id: string): Promise<void> {
    // Implementation goes here
  }

  async getTables(): Promise<RestaurantTable[]> {
    // Implementation goes here
    return [];
  }

  async createTable(payload: CreateTablePayload): Promise<string | null> {
    // Implementation goes here
    return null;
  }

  async updateTable(payload: UpdateTablePayload): Promise<void> {
    // Implementation goes here
  }

  async deleteTable(id: string): Promise<void> {
    // Implementation goes here
  }

  async createSale(payload: CreateSalePayload): Promise<string | null> {
    // Implementation goes here
    return null;
  }

  async updateDraftOrder(payload: UpdateDraftOrderPayload): Promise<void> {
    // Implementation goes here
  }

  async getTopSelling(limit?: number): Promise<Array<{ name: string; quantity: number }>> {
    // Implementation goes here
    return [];
  }

  async getSaleItems(saleId: string): Promise<SaleItemDetail[]> {
    // Implementation goes here
    return [];
  }

  async getSalePricingSummary(saleId: string): Promise<SalePricingSummary | null> {
    // Implementation goes here
    return null;
  }

  async getRevenueInRange(startUnix: number, endUnix: number): Promise<number> {
    // Implementation goes here
    return 0;
  }

  async getDashboardSummary(startUnix: number, endUnix: number, bucket?: DashboardTrendBucket): Promise<DashboardSalesSummary> {
    // Implementation goes here
    return {} as DashboardSalesSummary;
  }

  async getOrderTypeSurchargeConfig(): Promise<OrderTypeSurchargeConfig> {
    // Implementation goes here
    return { toGoSurcharge: 0, deliverySurcharge: 0 };
  }

  async saveOrderTypeSurchargeConfig(payload: OrderTypeSurchargeConfig): Promise<void> {
    // Implementation goes here
  }

  async sendToKitchen(orderId: string): Promise<void> {
    // Implementation goes here
  }

  async markOrderReady(orderId: string): Promise<void> {
    // Implementation goes here
  }

  async markOrderPaid(orderId: string, paymentMethod: PaymentMethod): Promise<void> {
    // Implementation goes here
  }

  async addItemToOrder(payload: AddItemToOrderPayload): Promise<string> {
    // Implementation goes here
    return '';
  }

  async removeItemFromOrder(payload: RemoveItemFromOrderPayload): Promise<void> {
    // Implementation goes here
  }

  async cancelOrder(orderId: string): Promise<void> {
    // Implementation goes here
  }
}
