import type { AddCashRegisterAdjustmentPayload, AddEmployeePayload, AddExpensePayload, AddPayrollPayload, CloseCashRegisterPayload, DailyCashRegisterSummary, OpenCashRegisterPayload, UpdateEmployeePayload } from '@/types/accounts';
import type { CashRegisterAdjustment, CashRegisterSession, Employee, Expense, PayrollEntry } from '@/types/types';
import { apiClient } from './api-client';

export type AccountsHydrationData = {
  expenses: Expense[];
  employees: Employee[];
  payroll: PayrollEntry[];
  cashRegisterToday: CashRegisterSession | null;
  cashRegisterSummaryToday: DailyCashRegisterSummary;
};

export class AccountsService {
  async getHydrationData(): Promise<AccountsHydrationData> {
    const response = await apiClient.get<AccountsHydrationData>('/accounts');
    return response || {
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
    };
  }

  async addExpense(payload: AddExpensePayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/accounts/expenses', payload);
    return response.id || '';
  }

  async addEmployee(payload: AddEmployeePayload): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>('/accounts/employees', payload);
      return response.id || null;
    } catch {
      return null;
    }
  }

  async updateEmployee(payload: UpdateEmployeePayload): Promise<boolean> {
    try {
      await apiClient.put<{ ok: boolean }>(`/accounts/employees/${payload.id}`, payload);
      return true;
    } catch {
      return false;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      await apiClient.delete<{ ok: boolean }>(`/accounts/employees/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  async addPayroll(payload: AddPayrollPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/accounts/payroll', payload);
    return response.id || '';
  }

  async getExpensesTotalInRange(startUnix: number, endUnix: number): Promise<number> {
    const response = await apiClient.get<{ total: number }>(
      `/accounts/expenses/total?start=${startUnix}&end=${endUnix}`
    );
    return response.total || 0;
  }

  async openCashRegister(payload: OpenCashRegisterPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/accounts/cash-register/open', payload);
    return response.id || '';
  }

  async closeCashRegister(payload: CloseCashRegisterPayload): Promise<void> {
    await apiClient.post<{ ok: boolean }>('/accounts/cash-register/close', payload);
  }

  async getTodayCashRegisterSummary(): Promise<DailyCashRegisterSummary> {
    const response = await apiClient.get<{ summary: DailyCashRegisterSummary }>('/accounts/cash-register/summary/today');
    return response.summary || {
      incomeTotal: 0,
      expensesTotal: 0,
      net: 0,
      incomeByMethod: [],
      expensesByMethod: [],
    };
  }

  async addCashRegisterAdjustment(payload: AddCashRegisterAdjustmentPayload): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/accounts/cash-register/adjustments', payload);
    return response.id || '';
  }

  async getCashRegisterAdjustments(sessionId: string): Promise<CashRegisterAdjustment[]> {
    const response = await apiClient.get<{ adjustments: CashRegisterAdjustment[] }>(`/accounts/cash-register/${sessionId}/adjustments`);
    return response.adjustments || [];
  }
}
