import type { BuildReceiptInput, ReceiptData, ReceiptLineItem } from '@/types/receipt';
import type { SaleItemDetail, SalePayment } from '@/types/sales';
import type { Sale } from '@/types/types';
import { calculateInclusiveTax } from '@/utils/tax';

function getShortOrderId(orderId: string): string {
  return orderId.slice(0, 6).toUpperCase();
}

function mapReceiptItems(inputItems: BuildReceiptInput['items']): ReceiptLineItem[] {
  const childrenByParentId = new Map<string, NonNullable<ReceiptLineItem['children']>>();
  for (const item of inputItems) {
    if (item.parent_sale_item_id) {
      const list = childrenByParentId.get(item.parent_sale_item_id) ?? [];
      list.push({
        name: item.product_name,
        quantity: Number(item.quantity),
        extraPrice: Number(item.unit_price),
        additionalIngredients: (item.selected_additional_ingredient_details ?? []).map((d) => ({
          name: d.ingredient_name,
          quantity: Number(d.quantity),
          totalAdditionalPrice: Number(d.total_additional_price),
        })),
        removedIngredientIds: item.removed_ingredient_ids ?? [],
        observation: item.observation,
      });
      childrenByParentId.set(item.parent_sale_item_id, list);
    }
  }

  return inputItems
    .filter((item) => !item.parent_sale_item_id)
    .map((item) => ({
      id: item.id,
      name: item.product_name,
      observation: item.observation,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineSubtotal: Number(item.line_subtotal),
      discountAmount: Number(item.discount_amount),
      lineTotal: Number(item.final_line_total),
      discountName: item.discount_name,
      removedIngredientIds: item.removed_ingredient_ids ?? [],
      additionalIngredients: (item.selected_additional_ingredient_details ?? []).map((additional) => ({
        name: additional.ingredient_name,
        quantity: Number(additional.quantity),
        unitAdditionalPrice: Number(additional.unit_additional_price),
        totalAdditionalPrice: Number(additional.total_additional_price),
      })),
      children: childrenByParentId.get(item.id),
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
      logoRasterUrl: input.business.logoRasterUrl ?? null,
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

type BuildPartialReceiptInput = {
  sale: Sale;
  payment: SalePayment;
  saleItems: SaleItemDetail[];
  business: BuildReceiptInput['business'];
  taxConfig: BuildReceiptInput['taxConfig'];
  paperWidth: BuildReceiptInput['paperWidth'];
  globalDiscountName?: string | null;
  surchargeBreakdown?: BuildReceiptInput['surchargeBreakdown'];
};

export function buildPartialReceiptData(input: BuildPartialReceiptInput): ReceiptData {
  const itemsById = new Map(input.saleItems.map((item) => [item.id, item]));

  // Map payment lines to parent SaleItemDetail entries
  const parentItems: SaleItemDetail[] = input.payment.lines.map((line) => {
    const originalItem = itemsById.get(line.sale_item_id);
    const quantityPaid = Number(line.quantity_paid);
    const finalUnitPrice = quantityPaid > 0 ? Number(line.line_total) / quantityPaid : Number(line.unit_price);

    return {
      id: line.payment_item_id,
      product_id: line.product_id,
      parent_sale_item_id: null,
      product_name: originalItem?.product_name ?? line.product_name,
      observation: originalItem?.observation ?? null,
      quantity: quantityPaid,
      quantity_paid: quantityPaid,
      quantity_pending: 0,
      removed_ingredient_ids: originalItem?.removed_ingredient_ids ?? [],
      selected_additional_ingredients: originalItem?.selected_additional_ingredients ?? [],
      selected_additional_ingredient_details: originalItem?.selected_additional_ingredient_details ?? [],
      unit_price: Number(line.unit_price),
      line_subtotal: Number(line.line_subtotal),
      final_unit_price: finalUnitPrice,
      final_line_total: Number(line.line_total),
      discount_name: originalItem?.discount_name ?? null,
      discount_type: originalItem?.discount_type ?? null,
      discount_value: originalItem?.discount_value ?? null,
      discount_amount: Number(line.discount_amount),
    };
  });

  // Collect the original sale_item_ids for the paid lines so we can find their children
  const paidSaleItemIds = new Set(input.payment.lines.map((l) => l.sale_item_id));

  // Include child items whose parent was paid in this payment, rebinding parent_sale_item_id
  // to the payment_item_id so mapReceiptItems can group them correctly.
  const paymentItemIdBySaleItemId = new Map(
    input.payment.lines.map((l) => [l.sale_item_id, l.payment_item_id]),
  );
  const childItems: SaleItemDetail[] = input.saleItems
    .filter((item) => item.parent_sale_item_id && paidSaleItemIds.has(item.parent_sale_item_id))
    .map((item) => ({
      ...item,
      parent_sale_item_id: paymentItemIdBySaleItemId.get(item.parent_sale_item_id!) ?? item.parent_sale_item_id!,
    }));

  const items = [...parentItems, ...childItems];

  return buildReceiptData({
    sale: {
      id: input.sale.id,
      created_at: input.payment.paid_at,
      staff_name: input.sale.staff_name,
      table_name: input.sale.table_name,
      payment_method: input.payment.payment_method,
      status: input.sale.status,
      paid_at: input.payment.paid_at,
    },
    items,
    pricing: {
      subtotal: input.payment.subtotal,
      item_discount_total: input.payment.item_discount_total,
      global_discount_name: input.globalDiscountName ?? null,
      global_discount_type: null,
      global_discount_value: null,
      global_discount_amount: input.payment.global_discount_amount,
      order_type_surcharge: input.payment.surcharge_amount,
      total: input.payment.total,
      discount_applied_by: input.payment.created_by_name,
    },
    business: input.business,
    taxConfig: input.taxConfig,
    paperWidth: input.paperWidth,
    surchargeBreakdown: input.surchargeBreakdown,
  });
}

export function isSinglePaymentForWholeSale(saleItems: SaleItemDetail[], payments: SalePayment[]): boolean {
  if (payments.length !== 1) {
    return false;
  }

  const payment = payments[0];
  const paidBySaleItemId = new Map<string, number>();

  for (const line of payment.lines) {
    paidBySaleItemId.set(line.sale_item_id, (paidBySaleItemId.get(line.sale_item_id) ?? 0) + Number(line.quantity_paid));
  }

  return saleItems.every((item) => Number(item.quantity) === (paidBySaleItemId.get(item.id) ?? 0));
}
