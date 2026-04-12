import { db } from '../database';
import { employees, expenses, payrollEntries } from '../database/schema';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload } from '../types/accounts';
import type { Employee, Expense, PayrollEntry } from '../types/types';
import { between, desc, sql } from 'drizzle-orm';

export class AccountsSqliteService {
  async getHydrationData() {
    const expensesList = db
      .select({
        id: expenses.id,
        date: expenses.date,
        category: expenses.category,
        amount: expenses.amount,
        description: expenses.description,
      })
      .from(expenses)
      .orderBy(desc(expenses.date))
      .limit(50)
      .all() as Expense[];

    const employeesList = db
      .select({
        id: employees.id,
        name: employees.name,
        salary_type: employees.salaryType,
        rate: employees.rate,
      })
      .from(employees)
      .orderBy(employees.name)
      .all() as Employee[];

    const payrollList = db
      .select({
        id: payrollEntries.id,
        employee_id: payrollEntries.employeeId,
        period_start: payrollEntries.periodStart,
        period_end: payrollEntries.periodEnd,
        amount: payrollEntries.amount,
      })
      .from(payrollEntries)
      .orderBy(desc(payrollEntries.id))
      .limit(50)
      .all() as PayrollEntry[];

    return {
      expenses: expensesList,
      employees: employeesList,
      payroll: payrollList,
    };
  }

  async addExpense({ category, amount, description, dateUnix }: AddExpensePayload): Promise<string> {
    const date = dateUnix ?? Math.floor(Date.now() / 1000);
    const [inserted] = db.insert(expenses)
      .values({ date, category, amount, description: description ?? null })
      .returning({ id: expenses.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create expense.');
    }

    return inserted.id;
  }

  async addEmployee({ name, salaryType, rate }: AddEmployeePayload): Promise<string | null> {
    const [inserted] = db.insert(employees)
      .values({ name, salaryType, rate })
      .onConflictDoNothing()
      .returning({ id: employees.id })
      .all();

    return inserted?.id ?? null;
  }

  async addPayroll({ employeeId, periodStart, periodEnd, amount }: AddPayrollPayload): Promise<string> {
    const [inserted] = db.insert(payrollEntries)
      .values({ employeeId, periodStart, periodEnd, amount })
      .returning({ id: payrollEntries.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create payroll entry.');
    }

    return inserted.id;
  }

  async getExpensesTotalInRange(startUnix: number, endUnix: number): Promise<number> {
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(between(expenses.date, startUnix, endUnix))
      .get();
    return Number(row?.total ?? 0);
  }
}
