import { z } from 'zod';

import { t } from '@/i18n';
import {
    nameField,
    nonNegativeNumber,
    notesField,
    phoneField,
    pinField,
    positiveNumber,
    selectField,
} from './index';

/**
 * Per-form Zod schemas. Each mirrors the backend validation rules so the user
 * gets immediate, per-field feedback before the request is sent.
 */

export const employeeFormSchema = z.object({
    name: nameField,
    salaryType: z.enum(['hourly', 'monthly']),
    rate: positiveNumber,
});

export const userFormSchema = (isEditing: boolean) =>
    z.object({
        name: nameField,
        role: z.enum(['owner', 'staff']),
        // PIN is optional when editing (blank = keep current).
        pin: isEditing ? z.string().trim().regex(/^(\d{4,8})?$/, t('validation.pinFormat')) : pinField,
    });

export const tableFormSchema = z.object({
    name: nameField,
    tableType: z.enum(['dine-in', 'to-go', 'delivery']),
});

export const paymentMethodFormSchema = z.object({
    name: nameField,
    icon: selectField,
});

export const categoryFormSchema = z.object({
    name: nameField,
});

export const ingredientFormSchema = z.object({
    name: nameField,
    unit: selectField,
    lowStockThreshold: nonNegativeNumber,
});

export const supplierFormSchema = z.object({
    name: nameField,
    phone: phoneField,
    notes: notesField,
});

export const expenseFormSchema = z.object({
    category: nameField,
    amount: positiveNumber,
    description: notesField,
    paymentMethodId: selectField,
});

export const payrollFormSchema = z.object({
    employeeId: selectField,
    amount: positiveNumber,
    paymentMethodId: selectField,
});

export const restockFormSchema = z.object({
    ingredientId: selectField,
    quantityAdded: positiveNumber,
    cost: nonNegativeNumber,
    paymentMethodId: selectField,
});

export const productFormSchema = z.object({
    name: nameField,
    price: positiveNumber,
});

export const ownerAccountSchema = z
    .object({
        name: nameField,
        pin: pinField,
        pinConfirm: z.string(),
    })
    .refine((d) => d.pin === d.pinConfirm, {
        message: t('validation.pinMismatch'),
        path: ['pinConfirm'],
    });

export const discountFormSchema = z
    .object({
        name: nameField,
        scope: z.enum(['global', 'product']),
        productId: z.string().trim().optional(),
        type: z.enum(['percentage', 'fixed']),
        value: positiveNumber,
        hourStart: z.number().int().min(0).max(24).nullable().optional(),
        hourEnd: z.number().int().min(0).max(24).nullable().optional(),
    })
    .refine((d) => d.type !== 'percentage' || Number(d.value) <= 100, {
        message: t('validation.percentageMax'),
        path: ['value'],
    })
    .refine((d) => d.scope !== 'product' || !!d.productId, {
        message: t('validation.selectOption'),
        path: ['productId'],
    })
    .refine((d) => (d.hourStart == null) === (d.hourEnd == null), {
        message: t('validation.hourRange'),
        path: ['hourEnd'],
    })
    .refine((d) => d.hourStart == null || d.hourEnd == null || d.hourEnd > d.hourStart, {
        message: t('validation.hourRange'),
        path: ['hourEnd'],
    });
