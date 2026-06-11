import { z } from 'zod';
import type { SaleItemInput } from '../types/types';
import { coercedTimestamp, id, money, nameField, positiveQuantity, timestamp } from './rules';

const saleItemAdditionalIngredientSchema = z.object({
    ingredientId: id('ingredientId'),
    quantity: positiveQuantity('quantity'),
});

export const saleItemSchema: z.ZodType<SaleItemInput> = z.lazy(() =>
    z.object({
        productId: id('productId'),
        quantity: positiveQuantity('quantity'),
        unitPrice: money('unitPrice'),
        observation: z.string().trim().max(500).nullish(),
        removedIngredientIds: z.array(id('ingredientId')).optional(),
        additionalIngredients: z.array(saleItemAdditionalIngredientSchema).optional(),
        comboItems: z.array(saleItemSchema).optional(),
    }),
);

export const orderSchema = z.object({
    staffId: id('staffId'),
    items: z.array(saleItemSchema).min(1, 'items must be a non-empty array.'),
    tableId: id('tableId'),
    globalDiscountId: id('globalDiscountId').nullish(),
    orderTypeSurcharge: money('orderTypeSurcharge').optional(),
});
export type OrderPayload = z.infer<typeof orderSchema>;

export const addItemSchema = z.object({ item: saleItemSchema });
export type AddItemPayload = z.infer<typeof addItemSchema>;

export const markPaidSchema = z.object({ paymentMethodId: id('paymentMethodId') });
export type MarkPaidPayload = z.infer<typeof markPaidSchema>;

export const partialPaymentSchema = z.object({
    paymentMethodId: id('paymentMethodId'),
    lines: z
        .array(z.object({ saleItemId: id('saleItemId'), quantity: positiveQuantity('quantity') }))
        .min(1, 'lines must be a non-empty array.'),
});
export type PartialPaymentPayload = z.infer<typeof partialPaymentSchema>;

export const discountSchema = z
    .object({
        name: nameField,
        scope: z.enum(['global', 'product'], { message: 'scope must be global or product.' }),
        productId: id('productId').nullish(),
        type: z.enum(['percentage', 'fixed'], { message: 'type must be percentage or fixed.' }),
        value: z
            .number({ message: 'value must be a number.' })
            .positive('value must be greater than zero.'),
        startsAt: timestamp.default(0),
        endsAt: timestamp.nullish().transform((v) => v ?? null),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
        daysOfMonth: z.array(z.number().int().min(1).max(31)).default([]),
        hourStart: z.number().int().min(0).max(24).nullish().transform((v) => v ?? null),
        hourEnd: z.number().int().min(0).max(24).nullish().transform((v) => v ?? null),
        isActive: z.boolean({ message: 'isActive is required.' }),
    })
    .refine((d) => d.type !== 'percentage' || d.value <= 100, {
        message: 'percentage discount value must be at most 100.',
        path: ['value'],
    })
    .refine((d) => d.scope !== 'product' || !!d.productId, {
        message: 'productId is required for product-scoped discounts.',
        path: ['productId'],
    })
    .refine((d) => d.endsAt == null || d.endsAt > d.startsAt, {
        message: 'endsAt must be after startsAt.',
        path: ['endsAt'],
    })
    .refine((d) => (d.hourStart == null) === (d.hourEnd == null), {
        message: 'hourStart and hourEnd must be set together.',
        path: ['hourEnd'],
    })
    .refine((d) => d.hourStart == null || d.hourEnd == null || d.hourEnd > d.hourStart, {
        message: 'hourEnd must be after hourStart.',
        path: ['hourEnd'],
    });
export type DiscountPayload = z.infer<typeof discountSchema>;

export const tableSchema = z.object({
    name: nameField,
    tableType: z.enum(['dine-in', 'to-go', 'delivery'], {
        message: 'tableType must be dine-in, to-go, or delivery.',
    }),
});
export type TablePayload = z.infer<typeof tableSchema>;

export const surchargeConfigSchema = z.object({
    toGoSurcharge: money('toGoSurcharge'),
    deliverySurcharge: money('deliverySurcharge'),
});
export type SurchargeConfigPayload = z.infer<typeof surchargeConfigSchema>;

export const dateRangeSchema = z
    .object({ start: coercedTimestamp, end: coercedTimestamp })
    .refine((q) => q.start < q.end, {
        message: 'start and end are required unix timestamps with start < end.',
        path: ['end'],
    });
export type DateRangeQuery = z.infer<typeof dateRangeSchema>;

export const dashboardQuerySchema = z
    .object({
        start: coercedTimestamp,
        end: coercedTimestamp,
        bucket: z.enum(['hour', 'day']).default('day'),
    })
    .refine((q) => q.start < q.end, {
        message: 'start and end are required unix timestamps with start < end.',
        path: ['end'],
    });
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
