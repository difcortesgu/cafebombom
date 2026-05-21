import type { ValidationResult } from './types';

export type AddIngredientPayload = {
    name: string;
    unit: string;
    lowStockThreshold: number;
    supplierId: string | undefined;
};

export function validateAddIngredient(body: Record<string, unknown>): ValidationResult<AddIngredientPayload> {
    const { name, unit, lowStockThreshold, supplierId } = body;
    if (!name || !unit || lowStockThreshold == null) {
        return { valid: false, error: 'name, unit, and lowStockThreshold are required.' };
    }
    const normalizedUnit = String(unit).trim().toLowerCase();
    if (!normalizedUnit) {
        return { valid: false, error: 'unit is required.' };
    }
    return {
        valid: true,
        data: {
            name: String(name),
            unit: normalizedUnit,
            lowStockThreshold: Number(lowStockThreshold),
            supplierId: supplierId != null ? String(supplierId) : undefined,
        },
    };
}

export type UpdateIngredientPayload = {
    name: string | undefined;
    unit: string | undefined;
    low_stock_threshold: number | undefined;
    supplier_id: string | undefined;
};

export function validateUpdateIngredient(body: Record<string, unknown>): ValidationResult<UpdateIngredientPayload> {
    const { name, unit, low_stock_threshold, supplier_id } = body;
    let normalizedUnit: string | undefined;
    if (unit !== undefined) {
        normalizedUnit = String(unit).trim().toLowerCase();
        if (!normalizedUnit) {
            return { valid: false, error: 'unit cannot be empty.' };
        }
    }
    return {
        valid: true,
        data: {
            name: name != null ? String(name) : undefined,
            unit: normalizedUnit,
            low_stock_threshold: low_stock_threshold != null ? Number(low_stock_threshold) : undefined,
            supplier_id: supplier_id != null ? String(supplier_id) : undefined,
        },
    };
}

export type AddSupplierPayload = { name: string; phone: string | undefined; notes: string | undefined };

export function validateAddSupplier(body: Record<string, unknown>): ValidationResult<AddSupplierPayload> {
    const { name, phone, notes } = body;
    if (!name) {
        return { valid: false, error: 'name is required.' };
    }
    return {
        valid: true,
        data: {
            name: String(name),
            phone: phone != null ? String(phone) : undefined,
            notes: notes != null ? String(notes) : undefined,
        },
    };
}

export type UpdateSupplierPayload = { id: string; name: string | undefined; phone: string | undefined; notes: string | undefined };

export function validateUpdateSupplier(params: Record<string, unknown>, body: Record<string, unknown>): ValidationResult<UpdateSupplierPayload> {
    const { id } = params;
    const { name, phone, notes } = body;
    if (!id) {
        return { valid: false, error: 'id is required.' };
    }
    return {
        valid: true,
        data: {
            id: String(id),
            name: name != null ? String(name) : undefined,
            phone: phone != null ? String(phone) : undefined,
            notes: notes != null ? String(notes) : undefined,
        },
    };
}

export type AddUnitPayload = { name: string };

export function validateAddUnit(body: Record<string, unknown>): ValidationResult<AddUnitPayload> {
    const name = String(body.name ?? '').trim().toLowerCase();
    if (!name) {
        return { valid: false, error: 'name is required.' };
    }
    return { valid: true, data: { name } };
}

export type DeleteUnitPayload = { id: string };

export function validateDeleteUnit(params: Record<string, unknown>): ValidationResult<DeleteUnitPayload> {
    const { id } = params;
    if (!id) {
        return { valid: false, error: 'id is required.' };
    }
    return { valid: true, data: { id: String(id) } };
}

export type AddRestockPayload = {
    ingredientId: string;
    quantityAdded: number;
    cost: number;
    supplierId: string | undefined;
    paymentMethodId: string;
};

export function validateAddRestock(body: Record<string, unknown>): ValidationResult<AddRestockPayload> {
    const { ingredientId, quantityAdded, cost, supplierId, paymentMethodId } = body;
    if (!ingredientId || quantityAdded == null || cost == null || !paymentMethodId) {
        return { valid: false, error: 'ingredientId, quantityAdded, cost, and paymentMethodId are required.' };
    }
    return {
        valid: true,
        data: {
            ingredientId: String(ingredientId),
            quantityAdded: Number(quantityAdded),
            cost: Number(cost),
            supplierId: supplierId != null ? String(supplierId) : undefined,
            paymentMethodId: String(paymentMethodId),
        },
    };
}
