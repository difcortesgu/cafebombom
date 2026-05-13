import type { DiscountType, OrderStatus, PaymentMethod, SaleItemAdditionalIngredientInput, SaleItemInput, TableType } from '@/types/types';

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

export type SaleItemAdditionalIngredientDetail = {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit_additional_price: number;
  total_additional_price: number;
};

export type SaleItemDetail = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  quantity_paid: number;
  quantity_pending: number;
  removed_ingredient_ids: string[];
  selected_additional_ingredients: SaleItemAdditionalIngredientInput[];
  selected_additional_ingredient_details: SaleItemAdditionalIngredientDetail[];
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

export type PartialPaymentLineInput = {
  saleItemId: string;
  quantity: number;
};

export type CreatePartialPaymentPayload = {
  orderId: string;
  paymentMethod: PaymentMethod;
  lines: PartialPaymentLineInput[];
};

export type SalePaymentLine = {
  payment_item_id: string;
  sale_item_id: string;
  product_id: string;
  product_name: string;
  quantity_paid: number;
  unit_price: number;
  line_subtotal: number;
  discount_amount: number;
  line_total: number;
};

export type SalePayment = {
  id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  subtotal: number;
  item_discount_total: number;
  global_discount_amount: number;
  surcharge_amount: number;
  total: number;
  paid_at: number;
  created_by_name: string | null;
  lines: SalePaymentLine[];
};

export type SalePaymentBoardItem = {
  sale_item_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  discount_amount_total: number;
  line_subtotal_total: number;
  line_total_total: number;
  quantity_total: number;
  quantity_paid: number;
  quantity_pending: number;
};

export type SalePaymentBoard = {
  sale_id: string;
  pending: SalePaymentBoardItem[];
  paid: SalePayment[];
};
