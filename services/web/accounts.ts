import type { AccountsService } from '@/services/interfaces/accounts';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload } from '@/types/accounts';

import { getDb } from './storage';

export class AccountsWebService implements AccountsService {
  async getHydrationData() {
    const db = await getDb();
    const [expenses, employees, payrollEntries] = await Promise.all([
      db.expenses.toArray(),
      db.employees.toArray(),
      db.payrollEntries.toArray(),
    ]);

    return {
      expenses: expenses
        .slice()
        .sort((left, right) => right.date - left.date)
        .slice(0, 50),
      employees: employees
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          salary_type: employee.salaryType,
          rate: employee.rate,
        })),
      payroll: payrollEntries
        .slice()
        .sort((left, right) => right.periodEnd - left.periodEnd)
        .slice(0, 50)
        .map((entry) => ({
          id: entry.id,
          employee_id: entry.employeeId,
          period_start: entry.periodStart,
          period_end: entry.periodEnd,
          amount: entry.amount,
        })),
    };
  }

  async addExpense({ category, amount, description, dateUnix }: AddExpensePayload): Promise<void> {
    const db = await getDb();
    await db.expenses.add({
      date: dateUnix ?? Math.floor(Date.now() / 1000),
      category,
      amount,
      description: description ?? null,
      supplierId: null,
    });
  }

  async addEmployee({ name, salaryType, rate }: AddEmployeePayload): Promise<void> {
    const db = await getDb();
    const existing = await db.employees
      .where('name')
      .equals(name)
      .count();

    if (existing > 0) {
      return;
    }

    await db.employees.add({
      name,
      salaryType,
      rate,
    });
  }

  async addPayroll({ employeeId, periodStart, periodEnd, amount }: AddPayrollPayload): Promise<void> {
    const db = await getDb();
    await db.payrollEntries.add({
      employeeId,
      periodStart,
      periodEnd,
      amount,
    });
  }

  async getExpensesTotalInRange(startUnix: number, endUnix: number): Promise<number> {
    const db = await getDb();
    return (await db.expenses
      .where('date')
      .between(startUnix, endUnix)
      .toArray())
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  }
}