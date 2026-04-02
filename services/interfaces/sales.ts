import type { CreateSalePayload, SaleItemDetail } from '@/types/sales';
import type { Product, Sale } from '@/types/types';

export type SalesHydrationData = {
  products: Product[];
  sales: Sale[];
};

export interface SalesService {
  getHydrationData(): Promise<SalesHydrationData>;
  createSale(payload: CreateSalePayload): Promise<void>;
  getTopSelling(limit?: number): Promise<Array<{ name: string; quantity: number }>>;
  getSaleItems(saleId: number): Promise<SaleItemDetail[]>;
  getRevenueInRange(startUnix: number, endUnix: number): Promise<number>;
}
