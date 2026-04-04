import type {
    CreateDiscountPayload,
    CreateSalePayload,
    CreateTablePayload,
    SaleItemDetail,
    SalePricingSummary,
    UpdateDiscountPayload,
    UpdateTablePayload,
} from '@/types/sales';
import type { Discount, Product, RestaurantTable, Sale } from '@/types/types';

export type SalesHydrationData = {
  products: Product[];
  sales: Sale[];
  tables: RestaurantTable[];
  discounts: Discount[];
};

export interface SalesService {
  getHydrationData(): Promise<SalesHydrationData>;
  getDiscounts(): Promise<Discount[]>;
  createDiscount(payload: CreateDiscountPayload): Promise<void>;
  updateDiscount(payload: UpdateDiscountPayload): Promise<void>;
  deleteDiscount(id: string): Promise<void>;
  getTables(): Promise<RestaurantTable[]>;
  createTable(payload: CreateTablePayload): Promise<void>;
  updateTable(payload: UpdateTablePayload): Promise<void>;
  deleteTable(id: string): Promise<void>;
  createSale(payload: CreateSalePayload): Promise<void>;
  getTopSelling(limit?: number): Promise<Array<{ name: string; quantity: number }>>;
  getSaleItems(saleId: string): Promise<SaleItemDetail[]>;
  getSalePricingSummary(saleId: string): Promise<SalePricingSummary | null>;
  getRevenueInRange(startUnix: number, endUnix: number): Promise<number>;
}
