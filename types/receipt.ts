import type { SaleItemDetail, SalePricingSummary } from '@/types/sales';
import type { OrderStatus, PaymentMethod } from '@/types/types';

export type ReceiptPaperWidth = 58 | 80;

export type TaxConfig = {
  label: string;
  rate: number;
  inclusive: boolean;
};

export type BusinessInfo = {
  name: string;
  address: string;
  phone: string;
  logoUri: string | null;
  footerMessage: string;
};

export type ReceiptLineItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discountAmount: number;
  lineTotal: number;
  discountName: string | null;
};

export type ReceiptPricingBreakdown = {
  subtotal: number;
  itemDiscountTotal: number;
  globalDiscountName: string | null;
  globalDiscountAmount: number;
  orderTypeSurcharge: number;
  surchargeBreakdown: Array<{
    label: string;
    description?: string | null;
    amount: number;
  }>;
  taxLabel: string;
  taxRate: number;
  taxAmount: number;
  preTaxTotal: number;
  total: number;
};

export type ReceiptMetadata = {
  orderId: string;
  orderShortId: string;
  createdAt: number;
  paidAt: number | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  tableName: string;
  staffName: string;
};

export type ReceiptData = {
  business: BusinessInfo;
  metadata: ReceiptMetadata;
  items: ReceiptLineItem[];
  pricing: ReceiptPricingBreakdown;
  paperWidth: ReceiptPaperWidth;
  qrCodeData: string | null;
};

export type ReceiptPreferences = {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessLogoUri: string | null;
  footerMessage: string;
  paperWidth: ReceiptPaperWidth;
  taxRate: number;
};

export type BuildReceiptInput = {
  sale: {
    id: string;
    created_at: number;
    staff_name: string;
    table_name: string;
    payment_method: PaymentMethod | null;
    status: OrderStatus;
    paid_at?: number | null;
  };
  items: SaleItemDetail[];
  pricing: SalePricingSummary;
  business: BusinessInfo;
  taxConfig: TaxConfig;
  paperWidth: ReceiptPaperWidth;
  qrCodeData?: string | null;
  surchargeBreakdown?: Array<{
    label: string;
    description?: string | null;
    amount: number;
  }>;
};
