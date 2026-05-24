import { create } from 'zustand';

import { accountsService, salesService } from '@/services';
import type { AddCashRegisterAdjustmentPayload, AddEmployeePayload, AddExpensePayload, AddPayrollPayload, CashRegisterHistoryDay, CloseCashRegisterPayload, DailyCashRegisterSummary, GetPnLPayload, OpenCashRegisterPayload, PnLSummary, UpdateEmployeePayload } from '@/types/accounts';
import type { CashRegisterAdjustment, CashRegisterSession, Employee, Expense, PayrollEntry } from '@/types/types';

type AccountsState = {
  expenses: Expense[];
  employees: Employee[];
  payroll: PayrollEntry[];
  cashRegisterToday: CashRegisterSession | null;
  cashRegisterSummaryToday: DailyCashRegisterSummary;
  cashRegisterAdjustments: CashRegisterAdjustment[];
  cashRegisterHistory: CashRegisterHistoryDay[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addExpense: (payload: AddExpensePayload) => Promise<void>;
  addEmployee: (payload: AddEmployeePayload) => Promise<void>;
  updateEmployee: (payload: UpdateEmployeePayload) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addPayroll: (payload: AddPayrollPayload) => Promise<void>;
  getPnL: (payload: GetPnLPayload) => Promise<PnLSummary>;
  openCashRegister: (payload: OpenCashRegisterPayload) => Promise<void>;
  closeCashRegister: (payload: CloseCashRegisterPayload) => Promise<void>;
  addCashRegisterAdjustment: (payload: AddCashRegisterAdjustmentPayload) => Promise<void>;
  loadCashRegisterAdjustments: (sessionId: string) => Promise<void>;
  loadCashRegisterHistory: () => Promise<void>;
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
  cashRegisterAdjustments: [],
  cashRegisterHistory: [],
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
    paymentMethodId,
  }: AddExpensePayload) => {
    await accountsService.addExpense({ category, amount, description, dateUnix, paymentMethodId });
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

  updateEmployee: async (payload: UpdateEmployeePayload) => {
    await accountsService.updateEmployee(payload);
    await get().hydrate();
  },

  deleteEmployee: async (id: string) => {
    await accountsService.deleteEmployee(id);
    await get().hydrate();
  },

  addPayroll: async ({
    employeeId,
    periodStart,
    periodEnd,
    amount,
    paymentMethodId,
  }: AddPayrollPayload) => {
    await accountsService.addPayroll({ employeeId, periodStart, periodEnd, amount, paymentMethodId });
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

  addCashRegisterAdjustment: async (payload: AddCashRegisterAdjustmentPayload) => {
    await accountsService.addCashRegisterAdjustment(payload);
    if (get().cashRegisterToday) {
      await get().loadCashRegisterAdjustments(get().cashRegisterToday!.id);
    }
    await get().loadCashRegisterHistory();
  },

  loadCashRegisterAdjustments: async (sessionId: string) => {
    const adjustments = await accountsService.getCashRegisterAdjustments(sessionId);
    set({ cashRegisterAdjustments: adjustments });
  },

  loadCashRegisterHistory: async () => {
    const history = await accountsService.getCashRegisterHistory();
    set({ cashRegisterHistory: history });
  },
}));
