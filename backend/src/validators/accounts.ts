import type { ValidationResult } from './types';

export type AddExpensePayload = {
    category: string;
    amount: number;
    description: string | undefined;
    dateUnix: number | undefined;
    paymentMethodId: string;
};

export function validateAddExpense(body: Record<string, unknown>): ValidationResult<AddExpensePayload> {
    const { category, amount, description, dateUnix, paymentMethodId } = body;
    if (!category || amount == null || !paymentMethodId) {
        return { valid: false, error: 'category, amount, and paymentMethodId are required.' };
    }
    return {
        valid: true,
        data: {
            category: String(category),
            amount: Number(amount),
            description: description != null ? String(description) : undefined,
            dateUnix: dateUnix != null ? Number(dateUnix) : undefined,
            paymentMethodId: String(paymentMethodId),
        },
    };
}

export type AddEmployeePayload = { name: string; salaryType: 'hourly' | 'monthly'; rate: number };

export function validateAddEmployee(body: Record<string, unknown>): ValidationResult<AddEmployeePayload> {
    const { name, salaryType, rate } = body;
    if (!name || !salaryType || rate == null) {
        return { valid: false, error: 'name, salaryType, and rate are required.' };
    }
    if (salaryType !== 'hourly' && salaryType !== 'monthly') {
        return { valid: false, error: 'salaryType must be hourly or monthly.' };
    }
    return {
        valid: true,
        data: { name: String(name), salaryType: salaryType as 'hourly' | 'monthly', rate: Number(rate) },
    };
}

export type AddPayrollPayload = {
    employeeId: string;
    periodStart: number;
    periodEnd: number;
    amount: number;
    paymentMethodId: string;
};

export function validateAddPayroll(body: Record<string, unknown>): ValidationResult<AddPayrollPayload> {
    const { employeeId, periodStart, periodEnd, amount, paymentMethodId } = body;
    if (!employeeId || periodStart == null || periodEnd == null || amount == null || !paymentMethodId) {
        return { valid: false, error: 'employeeId, periodStart, periodEnd, amount, and paymentMethodId are required.' };
    }
    return {
        valid: true,
        data: {
            employeeId: String(employeeId),
            periodStart: Number(periodStart),
            periodEnd: Number(periodEnd),
            amount: Number(amount),
            paymentMethodId: String(paymentMethodId),
        },
    };
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

export type OpenCashRegisterPayload = { openingAmount: number; notes: string | undefined };

export function validateOpenCashRegister(body: Record<string, unknown>): ValidationResult<OpenCashRegisterPayload> {
    const { openingAmount, notes } = body;
    if (openingAmount == null) {
        return { valid: false, error: 'openingAmount is required.' };
    }
    return {
        valid: true,
        data: { openingAmount: Number(openingAmount), notes: notes != null ? String(notes) : undefined },
    };
}

export type CloseCashRegisterPayload = { sessionId: string; closingAmount: number; notes: string | undefined };

export function validateCloseCashRegister(body: Record<string, unknown>): ValidationResult<CloseCashRegisterPayload> {
    const { sessionId, closingAmount, notes } = body;
    if (!sessionId || closingAmount == null) {
        return { valid: false, error: 'sessionId and closingAmount are required.' };
    }
    return {
        valid: true,
        data: {
            sessionId: String(sessionId),
            closingAmount: Number(closingAmount),
            notes: notes != null ? String(notes) : undefined,
        },
    };
}

export type AddAdjustmentPayload = { sessionId: string; amount: number; reason: string };

export function validateAddAdjustment(body: Record<string, unknown>): ValidationResult<AddAdjustmentPayload> {
    const { sessionId, amount, reason } = body;
    if (!sessionId || amount == null || !reason) {
        return { valid: false, error: 'sessionId, amount, and reason are required.' };
    }
    return {
        valid: true,
        data: { sessionId: String(sessionId), amount: Number(amount), reason: String(reason) },
    };
}

export type GetAdjustmentsPayload = { sessionId: string };

export function validateGetAdjustments(params: Record<string, unknown>): ValidationResult<GetAdjustmentsPayload> {
    const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
    if (!sessionId) {
        return { valid: false, error: 'sessionId is required.' };
    }
    return { valid: true, data: { sessionId: String(sessionId) } };
}
