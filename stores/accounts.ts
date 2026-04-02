import { create } from 'zustand';

import { execute, queryAll, queryFirst } from '@/database/db';
import { getRevenueInRange } from '@/stores/sales';
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

    const [expenses, employees, payroll] = await Promise.all([
      queryAll<Expense>('SELECT id, date, category, amount, description FROM expenses ORDER BY date DESC LIMIT 50;'),
      queryAll<Employee>('SELECT id, name, salary_type, rate FROM employees ORDER BY name;'),
      queryAll<PayrollEntry>(
        'SELECT id, employee_id, period_start, period_end, amount FROM payroll_entries ORDER BY id DESC LIMIT 50;'
      ),
    ]);

    set({ expenses, employees, payroll, loading: false });
  },

  addExpense: async ({
    category,
    amount,
    description,
    dateUnix,
  }: AddExpensePayload) => {
    const date = dateUnix ?? Math.floor(Date.now() / 1000);
    await execute(
      'INSERT INTO expenses (date, category, amount, description, synced_at) VALUES (?, ?, ?, ?, NULL);',
      [date, category, amount, description ?? null]
    );
    await get().hydrate();
  },

  addEmployee: async ({
    name,
    salaryType,
    rate,
  }: AddEmployeePayload) => {
    await execute(
      'INSERT OR IGNORE INTO employees (name, salary_type, rate, synced_at) VALUES (?, ?, ?, NULL);',
      [name, salaryType, rate]
    );
    await get().hydrate();
  },

  addPayroll: async ({
    employeeId,
    periodStart,
    periodEnd,
    amount,
  }: AddPayrollPayload) => {
    await execute(
      `INSERT INTO payroll_entries (employee_id, period_start, period_end, amount, synced_at)
       VALUES (?, ?, ?, ?, NULL);`,
      [employeeId, periodStart, periodEnd, amount]
    );
    await get().hydrate();
  },

  getPnL: async ({ startUnix, endUnix }: GetPnLPayload) => {
    const income = await getRevenueInRange(startUnix, endUnix);
    const expenseRow = await queryFirst<{ expenses: number }>(
      'SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses WHERE date BETWEEN ? AND ?;',
      [startUnix, endUnix]
    );
    const expenses = expenseRow?.expenses ?? 0;
    return {
      income,
      expenses,
      net: income - expenses,
    };
  },
}));
