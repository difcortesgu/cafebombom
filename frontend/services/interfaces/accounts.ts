import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload } from '@/types/accounts';
import type { Employee, Expense, PayrollEntry } from '@/types/types';

export type AccountsHydrationData = {
  expenses: Expense[];
  employees: Employee[];
  payroll: PayrollEntry[];
};

export interface AccountsService {
  getHydrationData(): Promise<AccountsHydrationData>;
  addExpense(payload: AddExpensePayload): Promise<string>;
  addEmployee(payload: AddEmployeePayload): Promise<string | null>;
  addPayroll(payload: AddPayrollPayload): Promise<string>;
  getExpensesTotalInRange(startUnix: number, endUnix: number): Promise<number>;
}
