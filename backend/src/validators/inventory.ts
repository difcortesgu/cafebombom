import { z } from 'zod';
import { id, money, nameField, nonNegativeQuantity, PHONE_REGEX, positiveQuantity } from './rules';

const unitField = z
    .string({ message: 'unit is required.' })
    .trim()
    .min(1, 'unit is required.')
    .transform((s) => s.toLowerCase());

const phoneField = z
    .string()
    .trim()
    .regex(PHONE_REGEX, 'phone has an invalid format.')
    .optional();

export const addIngredientSchema = z.object({
    name: nameField,
    unit: unitField,
    lowStockThreshold: nonNegativeQuantity('lowStockThreshold'),
    supplierId: id('supplierId').optional(),
});
export type AddIngredientPayload = z.infer<typeof addIngredientSchema>;

export const updateIngredientSchema = z.object({
    name: nameField.optional(),
    unit: unitField.optional(),
    low_stock_threshold: nonNegativeQuantity('lowStockThreshold').optional(),
    supplier_id: id('supplierId').nullish(),
});
export type UpdateIngredientPayload = z.infer<typeof updateIngredientSchema>;

export const addSupplierSchema = z.object({
    name: nameField,
    phone: phoneField,
    notes: z.string().trim().max(500).optional(),
});
export type AddSupplierPayload = z.infer<typeof addSupplierSchema>;

export const updateSupplierSchema = z.object({
    name: nameField.optional(),
    phone: phoneField,
    notes: z.string().trim().max(500).optional(),
});
export type UpdateSupplierPayload = z.infer<typeof updateSupplierSchema>;

export const addUnitSchema = z.object({ name: unitField });
export type AddUnitPayload = z.infer<typeof addUnitSchema>;

export const addRestockSchema = z.object({
    ingredientId: id('ingredientId'),
    quantityAdded: positiveQuantity('quantityAdded'),
    cost: money('cost'),
    supplierId: id('supplierId').optional(),
    paymentMethodId: id('paymentMethodId'),
});
export type AddRestockPayload = z.infer<typeof addRestockSchema>;
