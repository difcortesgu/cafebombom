
import type { CashRegisterAdjustment, CashRegisterSession } from './types';

export type AddExpensePayload = {
  category: string;
  amount: number;
  description?: string;
  dateUnix?: number;
  paymentMethodId: string;
};

export type OpenCashRegisterPayload = {
  openingAmount: number;
  notes?: string;
};

export type CloseCashRegisterPayload = {
  sessionId: string;
  closingAmount: number;
  notes?: string;
};

export type AddEmployeePayload = {
  name: string;
  salaryType: 'hourly' | 'monthly';
  rate: number;
};

export type UpdateEmployeePayload = {
  id: string;
  name: string;
  salaryType: 'hourly' | 'monthly';
  rate: number;
};

export type AddPayrollPayload = {
  employeeId: string;
  periodStart: number;
  periodEnd: number;
  amount: number;
  paymentMethodId: string;
};

export type GetPnLPayload = {
  startUnix: number;
  endUnix: number;
};

export type PnLSummary = {
  income: number;
  expenses: number;
  net: number;
};

type PaymentMethodAmountSummary = {
  payment_method_id: string;
  total: number;
  count: number;
};

export type DailyCashRegisterSummary = {
  incomeTotal: number;
  expensesTotal: number;
  net: number;
  incomeByMethod: PaymentMethodAmountSummary[];
  expensesByMethod: PaymentMethodAmountSummary[];
};

export type AddCashRegisterAdjustmentPayload = {
  sessionId: string;
  amount: number;
  reason: string;
};

export type CashRegisterHistoryDay = CashRegisterSession & {
  day_key: string;
  day_label: string;
  adjustment_total: number;
  adjustments: CashRegisterAdjustment[];
};