import { execute, queryAll, queryFirst } from '@/database/db';
import type { AccountsService } from '@/services/interfaces/accounts';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload } from '@/types/accounts';
import type { Employee, Expense, PayrollEntry } from '@/types/types';

export class AccountsSqliteService implements AccountsService {
  async getHydrationData() {
    const [expenses, employees, payroll] = await Promise.all([
      queryAll<Expense>('SELECT id, date, category, amount, description FROM expenses ORDER BY date DESC LIMIT 50;'),
      queryAll<Employee>('SELECT id, name, salary_type, rate FROM employees ORDER BY name;'),
      queryAll<PayrollEntry>(
        'SELECT id, employee_id, period_start, period_end, amount FROM payroll_entries ORDER BY id DESC LIMIT 50;'
      ),
    ]);

    return { expenses, employees, payroll };
  }

  async addExpense({ category, amount, description, dateUnix }: AddExpensePayload) {
    const date = dateUnix ?? Math.floor(Date.now() / 1000);
    await execute(
      'INSERT INTO expenses (date, category, amount, description, synced_at) VALUES (?, ?, ?, ?, NULL);',
      [date, category, amount, description ?? null]
    );
  }

  async addEmployee({ name, salaryType, rate }: AddEmployeePayload) {
    await execute(
      'INSERT OR IGNORE INTO employees (name, salary_type, rate, synced_at) VALUES (?, ?, ?, NULL);',
      [name, salaryType, rate]
    );
  }

  async addPayroll({ employeeId, periodStart, periodEnd, amount }: AddPayrollPayload) {
    await execute(
      `INSERT INTO payroll_entries (employee_id, period_start, period_end, amount, synced_at)
       VALUES (?, ?, ?, ?, NULL);`,
      [employeeId, periodStart, periodEnd, amount]
    );
  }

  async getExpensesTotalInRange(startUnix: number, endUnix: number) {
    const row = await queryFirst<{ expenses: number }>(
      'SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses WHERE date BETWEEN ? AND ?;',
      [startUnix, endUnix]
    );
    return row?.expenses ?? 0;
  }
}
