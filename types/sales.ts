import type { DiscountType, OrderStatus, PaymentMethod, SaleItemInput, TableType } from '@/types/types';

export type DashboardRangeKey = 'today' | 'week' | 'month';

export type DashboardTrendBucket = 'hour' | 'day';

export type DashboardTrendPoint = {
  bucket_start: number;
  total: number;
  sale_count: number;
};

export type DashboardPaymentBreakdown = {
  method: PaymentMethod;
  total: number;
  count: number;
};

export type DashboardTopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

export type DashboardStatusCounts = Record<OrderStatus, number>;

export type DashboardSalesSummary = {
  revenue: number;
  salesCount: number;
  averageOrderValue: number;
  statusCounts: DashboardStatusCounts;
  paymentBreakdown: DashboardPaymentBreakdown[];
  topProducts: DashboardTopProduct[];
  trend: DashboardTrendPoint[];
};

export type DiscountSnapshot = {
  discount_name: string | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  discount_amount: number;
};

export type SaleItemDetail = {
  id: string;
  product_id: string;
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
  order_type_surcharge: number;
  total: number;
  discount_applied_by: string | null;
};

export type CreateSalePayload = {
  staffId: string;
  items: SaleItemInput[];
  tableId: string;
  paymentMethod?: PaymentMethod;
  globalDiscountId?: string | null;
  orderTypeSurcharge?: number;
};

export type UpdateDraftOrderPayload = CreateSalePayload & {
  orderId: string;
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
  tableType: TableType;
};

export type UpdateTablePayload = {
  id: string;
  name: string;
  tableType: TableType;
};

export type AddItemToOrderPayload = {
  orderId: string;
  item: SaleItemInput;
};

export type RemoveItemFromOrderPayload = {
  orderId: string;
  saleItemId: string;
};
