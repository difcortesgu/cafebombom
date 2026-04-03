import type { CreateSalePayload, CreateTablePayload, SaleItemDetail, UpdateTablePayload } from '@/types/sales';
import type { Product, RestaurantTable, Sale } from '@/types/types';

export type SalesHydrationData = {
  products: Product[];
  sales: Sale[];
  tables: RestaurantTable[];
};

export interface SalesService {
  getHydrationData(): Promise<SalesHydrationData>;
  getTables(): Promise<RestaurantTable[]>;
  createTable(payload: CreateTablePayload): Promise<void>;
  updateTable(payload: UpdateTablePayload): Promise<void>;
  deleteTable(id: string): Promise<void>;
  createSale(payload: CreateSalePayload): Promise<void>;
  getTopSelling(limit?: number): Promise<Array<{ name: string; quantity: number }>>;
  getSaleItems(saleId: string): Promise<SaleItemDetail[]>;
  getRevenueInRange(startUnix: number, endUnix: number): Promise<number>;
}
