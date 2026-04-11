
export type AddExpensePayload = {
  category: string;
  amount: number;
  description?: string;
  dateUnix?: number;
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