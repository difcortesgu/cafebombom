import type { AccountsService } from '@/services/interfaces/accounts';
import type { AddEmployeePayload, AddExpensePayload, AddPayrollPayload } from '@/types/accounts';

import { nextId, readWebData, updateWebData } from './storage';

export class AccountsWebService implements AccountsService {
  async getHydrationData() {
    const data = readWebData();

    return {
      expenses: data.expenses
        .slice()
        .sort((left, right) => right.date - left.date)
        .slice(0, 50),
      employees: data.employees
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          salary_type: employee.salaryType,
          rate: employee.rate,
        })),
      payroll: data.payrollEntries
        .slice()
        .sort((left, right) => right.id - left.id)
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
    updateWebData((data) => {
      data.expenses.push({
        id: nextId(data, 'expenses'),
        date: dateUnix ?? Math.floor(Date.now() / 1000),
        category,
        amount,
        description: description ?? null,
        supplierId: null,
      });
    });
  }

  async addEmployee({ name, salaryType, rate }: AddEmployeePayload): Promise<void> {
    updateWebData((data) => {
      if (data.employees.some((employee) => employee.name === name)) {
        return;
      }

      data.employees.push({
        id: nextId(data, 'employees'),
        name,
        salaryType,
        rate,
      });
    });
  }

  async addPayroll({ employeeId, periodStart, periodEnd, amount }: AddPayrollPayload): Promise<void> {
    updateWebData((data) => {
      data.payrollEntries.push({
        id: nextId(data, 'payrollEntries'),
        employeeId,
        periodStart,
        periodEnd,
        amount,
      });
    });
  }

  async getExpensesTotalInRange(startUnix: number, endUnix: number): Promise<number> {
    return readWebData().expenses
      .filter((expense) => expense.date >= startUnix && expense.date <= endUnix)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  }
}