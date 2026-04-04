import type { DiscountType, SaleItemInput } from '@/types/types';

export type DiscountSnapshot = {
  discount_name: string | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  discount_amount: number;
};

export type SaleItemDetail = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_subtotal: number;
  final_unit_price: number;
  final_line_total: number;
} & DiscountSnapshot;

export type SalePricingSummary = {
  subtotal: number;
  item_discount_total: number;
  global_discount_name: string | null;
  global_discount_type: DiscountType | null;
  global_discount_value: number | null;
  global_discount_amount: number;
  total: number;
  discount_applied_by: string | null;
};

export type CreateSalePayload = {
  staffId: string;
  items: SaleItemInput[];
  tableId: string;
  globalDiscountId?: string | null;
};

export type CreateDiscountPayload = {
  name: string;
  scope: 'product' | 'global';
  productId?: string | null;
  type: DiscountType;
  value: number;
  startsAt: number;
  endsAt: number | null;
  isActive: boolean;
};

export type UpdateDiscountPayload = CreateDiscountPayload & {
  id: string;
};

export type CreateTablePayload = {
  name: string;
};

export type UpdateTablePayload = {
  id: string;
  name: string;
};
