import type { SaleItemDetail, SalePricingSummary } from '@/types/sales';
import type { Sale } from '@/types/types';

export function buildFallbackPricingSummary(sale: Sale, items: SaleItemDetail[]): SalePricingSummary {
    const subtotal = items.reduce((sum, item) => sum + Number(item.line_subtotal ?? 0), 0);
    const itemDiscountTotal = items.reduce((sum, item) => sum + Number(item.discount_amount ?? 0), 0);
    const total = Number(sale.total ?? 0);
    const orderTypeSurcharge = Math.max(0, total - Math.max(0, subtotal - itemDiscountTotal));

    return {
        subtotal,
        item_discount_total: itemDiscountTotal,
        global_discount_name: null,
        global_discount_type: null,
        global_discount_value: null,
        global_discount_amount: 0,
        order_type_surcharge: orderTypeSurcharge,
        total,
        discount_applied_by: null,
    };
}
