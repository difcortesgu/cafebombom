import type { SaleItemInput } from '@/types/types';

export type SaleItemDetail = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type CreateSalePayload = {
  staffId: string;
  items: SaleItemInput[];
  tableId: string;
};

export type CreateTablePayload = {
  name: string;
};

export type UpdateTablePayload = {
  id: string;
  name: string;
};
