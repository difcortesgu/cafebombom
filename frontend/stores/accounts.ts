import { create } from 'zustand';

import { accountsService, salesService } from '@/services';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload, CloseCashRegisterPayload, DailyCashRegisterSummary, GetPnLPayload, OpenCashRegisterPayload, PnLSummary } from '@/types/accounts';
import type { CashRegisterSession, Employee, Expense, PayrollEntry } from '@/types/types';

type AccountsState = {
  expenses: Expense[];
  employees: Employee[];
  payroll: PayrollEntry[];
  cashRegisterToday: CashRegisterSession | null;
  cashRegisterSummaryToday: DailyCashRegisterSummary;
  loading: boolean;
  hydrate: () => Promise<void>;
  addExpense: (payload: AddExpensePayload) => Promise<void>;
  addEmployee: (payload: AddEmployeePayload) => Promise<void>;
  addPayroll: (payload: AddPayrollPayload) => Promise<void>;
  getPnL: (payload: GetPnLPayload) => Promise<PnLSummary>;
  openCashRegister: (payload: OpenCashRegisterPayload) => Promise<void>;
  closeCashRegister: (payload: CloseCashRegisterPayload) => Promise<void>;
};

export const useAccountsStore = create<AccountsState>((set, get) => ({
  expenses: [],
  employees: [],
  payroll: [],
  cashRegisterToday: null,
  cashRegisterSummaryToday: {
    incomeTotal: 0,
    expensesTotal: 0,
    net: 0,
    incomeByMethod: [],
    expensesByMethod: [],
  },
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const { expenses, employees, payroll, cashRegisterToday, cashRegisterSummaryToday } = await accountsService.getHydrationData();
    set({ expenses, employees, payroll, cashRegisterToday, cashRegisterSummaryToday, loading: false });
  },

  addExpense: async ({
    category,
    amount,
    description,
    dateUnix,
    paymentMethod,
  }: AddExpensePayload) => {
    await accountsService.addExpense({ category, amount, description, dateUnix, paymentMethod });
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
    paymentMethod,
  }: AddPayrollPayload) => {
    await accountsService.addPayroll({ employeeId, periodStart, periodEnd, amount, paymentMethod });
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

  openCashRegister: async (payload: OpenCashRegisterPayload) => {
    await accountsService.openCashRegister(payload);
    await get().hydrate();
  },

  closeCashRegister: async (payload: CloseCashRegisterPayload) => {
    await accountsService.closeCashRegister(payload);
    await get().hydrate();
  },
}));
