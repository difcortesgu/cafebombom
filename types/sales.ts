import type { SaleItemInput } from '@/types/types';

export type SaleItemDetail = {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type CreateSalePayload = {
  staffId: number;
  items: SaleItemInput[];
};
