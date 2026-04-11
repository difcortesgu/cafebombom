import { create } from 'zustand';

import { accountsService, salesService } from '@/services';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload, GetPnLPayload, PnLSummary } from '@/types/accounts';
import type { Employee, Expense, PayrollEntry } from '@/types/types';

type AccountsState = {
  expenses: Expense[];
  employees: Employee[];
  payroll: PayrollEntry[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addExpense: (payload: AddExpensePayload) => Promise<void>;
  addEmployee: (payload: AddEmployeePayload) => Promise<void>;
  addPayroll: (payload: AddPayrollPayload) => Promise<void>;
  getPnL: (payload: GetPnLPayload) => Promise<PnLSummary>;
};

export const useAccountsStore = create<AccountsState>((set, get) => ({
  expenses: [],
  employees: [],
  payroll: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { expenses, employees, payroll } = await accountsService.getHydrationData();
    set({ expenses, employees, payroll, loading: false });
  },

  addExpense: async ({
    category,
    amount,
    description,
    dateUnix,
  }: AddExpensePayload) => {
    await accountsService.addExpense({ category, amount, description, dateUnix });
    await get().hydrate();
  },

  addEmployee: async ({
    name,
    salaryType,
    rate,
  }: AddEmployeePayload) => {
    await accountsService.addEmployee({ name, salaryType, rate });
    await get().hydrate();
  },

  addPayroll: async ({
    employeeId,
    periodStart,
    periodEnd,
    amount,
  }: AddPayrollPayload) => {
    await accountsService.addPayroll({ employeeId, periodStart, periodEnd, amount });
    await get().hydrate();
  },

  getPnL: async ({ startUnix, endUnix }: GetPnLPayload) => {
    const income = await salesService.getRevenueInRange(startUnix, endUnix);
    const expenses = await accountsService.getExpensesTotalInRange(startUnix, endUnix);
    return {
      income,
      expenses,
      net: income - expenses,
    };
  },
}));
