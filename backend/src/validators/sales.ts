import type { DashboardTrendBucket } from '../types/sales';
import type { DiscountScope, DiscountType, SaleItemInput, TableType } from '../types/types';
import type { ValidationResult } from './types';

export type OrderPayload = {
    staffId: string;
    items: SaleItemInput[];
    tableId: string;
    globalDiscountId: string | null | undefined;
    orderTypeSurcharge: number | undefined;
};

export function validateOrderPayload(body: Record<string, unknown>): ValidationResult<OrderPayload> {
    const { staffId, items, tableId, globalDiscountId, orderTypeSurcharge } = body;
    if (!staffId || !Array.isArray(items) || items.length === 0 || !tableId) {
        return { valid: false, error: 'staffId, items (non-empty), and tableId are required.' };
    }
    return {
        valid: true,
        data: {
            staffId: String(staffId),
            items: items as SaleItemInput[],
            tableId: String(tableId),
            globalDiscountId: globalDiscountId != null ? String(globalDiscountId) : undefined,
            orderTypeSurcharge: orderTypeSurcharge != null ? Number(orderTypeSurcharge) : undefined,
        },
    };
}

export type AddItemPayload = { item: SaleItemInput };

export function validateAddItem(body: Record<string, unknown>): ValidationResult<AddItemPayload> {
    const { item } = body as { item?: Record<string, unknown> };
    if (!item || !item.productId || item.quantity == null) {
        return { valid: false, error: 'item with productId and quantity is required.' };
    }
    return { valid: true, data: { item: item as SaleItemInput } };
}

export type MarkPaidPayload = { paymentMethodId: string };

export function validateMarkPaid(body: Record<string, unknown>): ValidationResult<MarkPaidPayload> {
    const { paymentMethodId } = body;
    if (!paymentMethodId) {
        return { valid: false, error: 'paymentMethodId is required.' };
    }
    return { valid: true, data: { paymentMethodId: String(paymentMethodId) } };
}

export type PartialPaymentPayload = {
    paymentMethodId: string;
    lines: Array<{ saleItemId: string; quantity: number }>;
};

export function validatePartialPayment(body: Record<string, unknown>): ValidationResult<PartialPaymentPayload> {
    const { paymentMethodId, lines } = body as {
        paymentMethodId?: unknown;
        lines?: Array<{ saleItemId?: unknown; quantity?: unknown }>;
    };
    if (!paymentMethodId) {
        return { valid: false, error: 'paymentMethodId is required.' };
    }
    if (!Array.isArray(lines) || lines.length === 0) {
        return { valid: false, error: 'lines must be a non-empty array.' };
    }
    return {
        valid: true,
        data: {
            paymentMethodId: String(paymentMethodId),
            lines: lines.map((l) => ({ saleItemId: String(l.saleItemId ?? ''), quantity: Number(l.quantity ?? 0) })),
        },
    };
}

export type DiscountPayload = {
    name: string;
    scope: DiscountScope;
    productId: string | null | undefined;
    type: DiscountType;
    value: number;
    startsAt: number;
    endsAt: number | null;
    isActive: boolean;
};

export function validateDiscount(body: Record<string, unknown>): ValidationResult<DiscountPayload> {
    const { name, scope, productId, type, value, startsAt, endsAt, isActive } = body;
    if (!name || !scope || !type || value == null || isActive == null) {
        return { valid: false, error: 'name, scope, type, value, and isActive are required.' };
    }
    return {
        valid: true,
        data: {
            name: String(name),
            scope: scope as DiscountScope,
            productId: productId != null ? String(productId) : undefined,
            type: type as DiscountType,
            value: Number(value),
            startsAt: startsAt != null ? Number(startsAt) : 0,
            endsAt: endsAt != null ? Number(endsAt) : null,
            isActive: Boolean(isActive),
        },
    };
}

export type TablePayload = { name: string; tableType: TableType };

export function validateTablePayload(body: Record<string, unknown>): ValidationResult<TablePayload> {
    const { name, tableType } = body;
    if (!name || !tableType) {
        return { valid: false, error: 'name and tableType are required.' };
    }
    return { valid: true, data: { name: String(name), tableType: tableType as TableType } };
}

export type SurchargeConfigPayload = { toGoSurcharge: number; deliverySurcharge: number };

export function validateSurchargeConfig(body: Record<string, unknown>): ValidationResult<SurchargeConfigPayload> {
    const { toGoSurcharge, deliverySurcharge } = body;
    if (toGoSurcharge == null || deliverySurcharge == null) {
        return { valid: false, error: 'toGoSurcharge and deliverySurcharge are required.' };
    }
    return { valid: true, data: { toGoSurcharge: Number(toGoSurcharge), deliverySurcharge: Number(deliverySurcharge) } };
}

export type DateRangeQuery = { start: number; end: number };

export function validateDateRange(query: Record<string, unknown>): ValidationResult<DateRangeQuery> {
    const start = Number(query.start);
    const end = Number(query.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        return { valid: false, error: 'start and end are required unix timestamps with start < end.' };
    }
    return { valid: true, data: { start, end } };
}

export type DashboardQuery = DateRangeQuery & { bucket: DashboardTrendBucket };

const VALID_BUCKETS: DashboardTrendBucket[] = ['hour', 'day'];

export function validateDashboardQuery(query: Record<string, unknown>): ValidationResult<DashboardQuery> {
    const range = validateDateRange(query);
    if (!range.valid) return range;
    const bucket = (query.bucket ?? 'day') as DashboardTrendBucket;
    if (!VALID_BUCKETS.includes(bucket)) {
        return { valid: false, error: 'bucket must be hour or day.' };
    }
    return { valid: true, data: { ...range.data, bucket } };
}
