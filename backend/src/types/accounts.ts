
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
  userId: string;
};

export type CloseCashRegisterPayload = {
  sessionId: string;
  closingAmount: number;
  notes?: string;
  userId: string;
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