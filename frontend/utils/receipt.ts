import type { BuildReceiptInput, ReceiptData, ReceiptLineItem } from '@/types/receipt';
import { calculateInclusiveTax } from '@/utils/tax';

function getShortOrderId(orderId: string): string {
  return orderId.slice(0, 6).toUpperCase();
}

function mapReceiptItems(inputItems: BuildReceiptInput['items']): ReceiptLineItem[] {
  return inputItems.map((item) => ({
    id: item.id,
    name: item.product_name,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    lineSubtotal: Number(item.line_subtotal),
    discountAmount: Number(item.discount_amount),
    lineTotal: Number(item.final_line_total),
    discountName: item.discount_name,
    additionalIngredients: (item.selected_additional_ingredient_details ?? []).map((additional) => ({
      name: additional.ingredient_name,
      quantity: Number(additional.quantity),
      unitAdditionalPrice: Number(additional.unit_additional_price),
      totalAdditionalPrice: Number(additional.total_additional_price),
    })),
  }));
}

export function buildReceiptData(input: BuildReceiptInput): ReceiptData {
  const items = mapReceiptItems(input.items);
  const total = Number(input.pricing.total);
  const safeBusinessName = String(input.business.name ?? '').trim();
  const safeBusinessAddress = String(input.business.address ?? '').trim();
  const safeBusinessPhone = String(input.business.phone ?? '').trim();
  const safeBusinessNit = String(input.business.nit ?? '').trim();
  const safeFooterMessage = String(input.business.footerMessage ?? '').trim();
  const safeTaxRate = Number.isFinite(Number(input.taxConfig.rate)) ? Number(input.taxConfig.rate) : 0;
  const safeTaxLabel = String(input.taxConfig.label ?? 'IVA').trim() || 'IVA';

  const { taxAmount, preTaxAmount } = input.taxConfig.inclusive
    ? calculateInclusiveTax(total, safeTaxRate)
    : { taxAmount: 0, preTaxAmount: total };

  const surchargeBreakdown = (input.surchargeBreakdown ?? [])
    .filter((line) => Number(line.amount) > 0)
    .map((line) => ({
      label: String(line.label ?? '').trim() || 'Recargo',
      description: line.description == null ? null : String(line.description),
      amount: Number(line.amount),
    }));

  return {
    business: {
      name: safeBusinessName || 'CafeBomBom',
      address: safeBusinessAddress,
      phone: safeBusinessPhone,
      nit: safeBusinessNit,
      logoUri: input.business.logoUri,
      footerMessage: safeFooterMessage,
    },
    metadata: {
      orderId: input.sale.id,
      orderShortId: getShortOrderId(input.sale.id),
      createdAt: Number(input.sale.created_at),
      paidAt: input.sale.paid_at ?? null,
      status: input.sale.status,
      paymentMethod: input.sale.payment_method,
      tableName: input.sale.table_name,
      staffName: input.sale.staff_name,
    },
    items,
    pricing: {
      subtotal: Number(input.pricing.subtotal),
      itemDiscountTotal: Number(input.pricing.item_discount_total),
      globalDiscountName: input.pricing.global_discount_name,
      globalDiscountAmount: Number(input.pricing.global_discount_amount),
      orderTypeSurcharge: Number(input.pricing.order_type_surcharge),
      surchargeBreakdown,
      taxLabel: safeTaxLabel,
      taxRate: safeTaxRate,
      taxAmount,
      preTaxTotal: preTaxAmount,
      total,
    },
    paperWidth: input.paperWidth,
    qrCodeData: input.qrCodeData ?? null,
  };
}
