
import type { PaymentMethod } from '@/types/types';

export type AddExpensePayload = {
  category: string;
  amount: number;
  description?: string;
  dateUnix?: number;
  paymentMethod: PaymentMethod;
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

export type AddPayrollPayload = {
  employeeId: string;
  periodStart: number;
  periodEnd: number;
  amount: number;
  paymentMethod: PaymentMethod;
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

export type PaymentMethodAmountSummary = {
  payment_method_id: string;
  total: number;
};

export type DailyCashRegisterSummary = {
  incomeTotal: number;
  expensesTotal: number;
  net: number;
  incomeByMethod: PaymentMethodAmountSummary[];
  expensesByMethod: PaymentMethodAmountSummary[];
};