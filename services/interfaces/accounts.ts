import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload } from '@/types/accounts';
import type { Employee, Expense, PayrollEntry } from '@/types/types';

export type AccountsHydrationData = {
  expenses: Expense[];
  employees: Employee[];
  payroll: PayrollEntry[];
};

export interface AccountsService {
  getHydrationData(): Promise<AccountsHydrationData>;
  addExpense(payload: AddExpensePayload): Promise<void>;
  addEmployee(payload: AddEmployeePayload): Promise<void>;
  addPayroll(payload: AddPayrollPayload): Promise<void>;
  getExpensesTotalInRange(startUnix: number, endUnix: number): Promise<number>;
}
