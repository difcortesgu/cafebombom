import { z } from 'zod';
import { coercedTimestamp, id, money, nameField, notesField, positiveMoney, timestamp } from './rules';

export const addExpenseSchema = z.object({
    category: nameField,
    amount: positiveMoney('amount'),
    description: notesField,
    dateUnix: timestamp.optional(),
    paymentMethodId: id('paymentMethodId'),
});
export type AddExpensePayload = z.infer<typeof addExpenseSchema>;

const salaryTypeField = z.enum(['hourly', 'monthly'], {
    message: 'salaryType must be hourly or monthly.',
});

export const employeeSchema = z.object({
    name: nameField,
    salaryType: salaryTypeField,
    rate: positiveMoney('rate'),
});
export type EmployeePayload = z.infer<typeof employeeSchema>;

export const addPayrollSchema = z
    .object({
        employeeId: id('employeeId'),
        periodStart: timestamp,
        periodEnd: timestamp,
        amount: positiveMoney('amount'),
        paymentMethodId: id('paymentMethodId'),
    })
    .refine((p) => p.periodStart < p.periodEnd, {
        message: 'periodStart must be before periodEnd.',
        path: ['periodEnd'],
    });
export type AddPayrollPayload = z.infer<typeof addPayrollSchema>;

export const dateRangeSchema = z
    .object({ start: coercedTimestamp, end: coercedTimestamp })
    .refine((q) => q.start < q.end, {
        message: 'start and end are required unix timestamps with start < end.',
        path: ['end'],
    });
export type DateRangeQuery = z.infer<typeof dateRangeSchema>;

export const openCashRegisterSchema = z.object({
    openingAmount: money('openingAmount'),
    notes: notesField,
});
export type OpenCashRegisterPayload = z.infer<typeof openCashRegisterSchema>;

export const closeCashRegisterSchema = z.object({
    sessionId: id('sessionId'),
    closingAmount: money('closingAmount'),
    notes: notesField,
});
export type CloseCashRegisterPayload = z.infer<typeof closeCashRegisterSchema>;

export const addAdjustmentSchema = z.object({
    sessionId: id('sessionId'),
    amount: z.number({ message: 'amount must be a number.' }),
    reason: nameField,
});
export type AddAdjustmentPayload = z.infer<typeof addAdjustmentSchema>;

export const getAdjustmentsSchema = z.object({ sessionId: id('sessionId') });
export type GetAdjustmentsPayload = z.infer<typeof getAdjustmentsSchema>;
