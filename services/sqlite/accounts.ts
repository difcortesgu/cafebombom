import { db, dbReady } from '@/database/db';
import { employees, expenses, payrollEntries } from '@/database/schema';
import type { AccountsService } from '@/services/interfaces/accounts';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload } from '@/types/accounts';
import type { Employee, Expense, PayrollEntry } from '@/types/types';
import { between, desc, sql } from 'drizzle-orm';

export class AccountsSqliteService implements AccountsService {
  async getHydrationData() {
    await dbReady;
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

  async addExpense({ category, amount, description, dateUnix }: AddExpensePayload): Promise<void> {
    await dbReady;
    const date = dateUnix ?? Math.floor(Date.now() / 1000);
    db.insert(expenses).values({ date, category, amount, description: description ?? null }).run();
  }

  async addEmployee({ name, salaryType, rate }: AddEmployeePayload): Promise<void> {
    await dbReady;
    db.insert(employees).values({ name, salaryType, rate }).onConflictDoNothing().run();
  }

  async addPayroll({ employeeId, periodStart, periodEnd, amount }: AddPayrollPayload): Promise<void> {
    await dbReady;
    db.insert(payrollEntries).values({ employeeId, periodStart, periodEnd, amount }).run();
  }

  async getExpensesTotalInRange(startUnix: number, endUnix: number): Promise<number> {
    await dbReady;
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(between(expenses.date, startUnix, endUnix))
      .get();
    return Number(row?.total ?? 0);
  }
}
