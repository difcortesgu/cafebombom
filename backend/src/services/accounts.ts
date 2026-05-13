import { db } from '@/database';
import { cashRegisterSessions, employees, expenses, payrollEntries } from '@/database/schema';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload, CloseCashRegisterPayload, OpenCashRegisterPayload } from '@/types/accounts';
import type { CashRegisterSession, Employee, Expense, PayrollEntry } from '@/types/types';
import { and, between, desc, gte, lte, sql } from 'drizzle-orm';

export class AccountsSqliteService {
  async getHydrationData() {
    const expensesList = db
      .select({
        id: expenses.id,
        date: expenses.date,
        category: expenses.category,
        amount: expenses.amount,
        description: expenses.description,
        payment_method: expenses.paymentMethod,
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
        payment_method: payrollEntries.paymentMethod,
      })
      .from(payrollEntries)
      .orderBy(desc(payrollEntries.id))
      .limit(50)
      .all() as PayrollEntry[];

    const todayCashRegister = await this.getTodayCashRegister();

    return {
      expenses: expensesList,
      employees: employeesList,
      payroll: payrollList,
      cashRegisterToday: todayCashRegister,
    };
  }

  async addExpense({ category, amount, description, dateUnix, paymentMethod }: AddExpensePayload): Promise<string> {
    const date = dateUnix ?? Math.floor(Date.now() / 1000);
    const [inserted] = db.insert(expenses)
      .values({ date, category, amount, description: description ?? null, paymentMethod })
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

  async addPayroll({ employeeId, periodStart, periodEnd, amount, paymentMethod }: AddPayrollPayload): Promise<string> {
    const [inserted] = db.insert(payrollEntries)
      .values({ employeeId, periodStart, periodEnd, amount, paymentMethod })
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

  async getTodayCashRegister(): Promise<CashRegisterSession | null> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startUnix = Math.floor(startOfDay.getTime() / 1000);
    const endUnix = Math.floor(endOfDay.getTime() / 1000);

    const row = db
      .select({
        id: cashRegisterSessions.id,
        opening_amount: cashRegisterSessions.openingAmount,
        closing_amount: cashRegisterSessions.closingAmount,
        opening_notes: cashRegisterSessions.openingNotes,
        closing_notes: cashRegisterSessions.closingNotes,
        opened_at: cashRegisterSessions.openedAt,
        closed_at: cashRegisterSessions.closedAt,
        opened_by: cashRegisterSessions.openedBy,
        closed_by: cashRegisterSessions.closedBy,
      })
      .from(cashRegisterSessions)
      .where(and(gte(cashRegisterSessions.openedAt, startUnix), lte(cashRegisterSessions.openedAt, endUnix)))
      .orderBy(desc(cashRegisterSessions.openedAt))
      .get() as CashRegisterSession | undefined;

    return row ?? null;
  }

  async openCashRegister({ openingAmount, notes, userId }: OpenCashRegisterPayload): Promise<string> {
    const existing = await this.getTodayCashRegister();
    if (existing) {
      throw new Error('A cash register session is already open for today.');
    }

    const now = Math.floor(Date.now() / 1000);
    const [inserted] = db.insert(cashRegisterSessions)
      .values({
        openingAmount,
        openingNotes: notes ?? null,
        openedAt: now,
        openedBy: userId,
      })
      .returning({ id: cashRegisterSessions.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to open cash register session.');
    }

    return inserted.id;
  }

  async closeCashRegister({ sessionId, closingAmount, notes, userId }: CloseCashRegisterPayload): Promise<void> {
    const session = db
      .select({ id: cashRegisterSessions.id, closedAt: cashRegisterSessions.closedAt })
      .from(cashRegisterSessions)
      .where(sql`${cashRegisterSessions.id} = ${sessionId}`)
      .get();

    if (!session) {
      throw new Error('Cash register session not found.');
    }

    if (session.closedAt !== null) {
      throw new Error('Cash register session is already closed.');
    }

    const now = Math.floor(Date.now() / 1000);
    db.update(cashRegisterSessions)
      .set({
        closingAmount,
        closingNotes: notes ?? null,
        closedAt: now,
        closedBy: userId,
      })
      .where(sql`${cashRegisterSessions.id} = ${sessionId}`)
      .run();
  }
}
