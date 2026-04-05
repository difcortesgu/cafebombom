import type {
    AddItemToOrderPayload,
    CreateDiscountPayload,
    CreateSalePayload,
    CreateTablePayload,
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

export interface SalesService {
  getHydrationData(): Promise<SalesHydrationData>;
  getDiscounts(): Promise<Discount[]>;
  createDiscount(payload: CreateDiscountPayload): Promise<string>;
  updateDiscount(payload: UpdateDiscountPayload): Promise<void>;
  deleteDiscount(id: string): Promise<void>;
  getTables(): Promise<RestaurantTable[]>;
  createTable(payload: CreateTablePayload): Promise<string | null>;
  updateTable(payload: UpdateTablePayload): Promise<void>;
  deleteTable(id: string): Promise<void>;
  createSale(payload: CreateSalePayload): Promise<string | null>;
  updateDraftOrder(payload: UpdateDraftOrderPayload): Promise<void>;
  getTopSelling(limit?: number): Promise<Array<{ name: string; quantity: number }>>;
  getSaleItems(saleId: string): Promise<SaleItemDetail[]>;
  getSalePricingSummary(saleId: string): Promise<SalePricingSummary | null>;
  getRevenueInRange(startUnix: number, endUnix: number): Promise<number>;
  getOrderTypeSurchargeConfig(): Promise<OrderTypeSurchargeConfig>;
  saveOrderTypeSurchargeConfig(payload: OrderTypeSurchargeConfig): Promise<void>;
  sendToKitchen(orderId: string): Promise<void>;
  markOrderReady(orderId: string): Promise<void>;
  markOrderPaid(orderId: string, paymentMethod?: PaymentMethod): Promise<void>;
  addItemToOrder(payload: AddItemToOrderPayload): Promise<string>;
  removeItemFromOrder(payload: RemoveItemFromOrderPayload): Promise<void>;
  cancelOrder(orderId: string): Promise<void>;
}
