import { AccountsSqliteService } from '@/services/accounts';
import type { Request, Response } from 'express';

const accountsService = new AccountsSqliteService();

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  try {
    const data = await accountsService.getHydrationData();
    res.status(200).json(data);
  } catch (error) {
    console.error('[accounts] getHydrationData failed:', error);
    res.status(500).json({ error: 'Failed to fetch accounts data.' });
  }
}

export async function addExpense(req: Request, res: Response): Promise<void> {
  const { category, amount, description, dateUnix } = req.body;

  if (!category || amount == null) {
    res.status(400).json({ error: 'category and amount are required.' });
    return;
  }

  try {
    const id = await accountsService.addExpense({ category, amount, description, dateUnix });
    res.status(201).json({ id });
  } catch (error) {
    console.error('[accounts] addExpense failed:', error);
    res.status(500).json({ error: 'Failed to create expense.' });
  }
}

export async function addEmployee(req: Request, res: Response): Promise<void> {
  const { name, salaryType, rate } = req.body;

  if (!name || !salaryType || rate == null) {
    res.status(400).json({ error: 'name, salaryType, and rate are required.' });
    return;
  }

  if (salaryType !== 'hourly' && salaryType !== 'monthly') {
    res.status(400).json({ error: 'salaryType must be hourly or monthly.' });
    return;
  }

  try {
    const id = await accountsService.addEmployee({ name, salaryType, rate });
    if (!id) {
      res.status(409).json({ error: 'An employee with that name already exists.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    console.error('[accounts] addEmployee failed:', error);
    res.status(500).json({ error: 'Failed to create employee.' });
  }
}

export async function addPayroll(req: Request, res: Response): Promise<void> {
  const { employeeId, periodStart, periodEnd, amount } = req.body;

  if (!employeeId || periodStart == null || periodEnd == null || amount == null) {
    res.status(400).json({ error: 'employeeId, periodStart, periodEnd, and amount are required.' });
    return;
  }

  try {
    const id = await accountsService.addPayroll({ employeeId, periodStart, periodEnd, amount });
    res.status(201).json({ id });
  } catch (error) {
    console.error('[accounts] addPayroll failed:', error);
    res.status(500).json({ error: 'Failed to create payroll entry.' });
  }
}

export async function getExpensesTotal(req: Request, res: Response): Promise<void> {
  const start = Number(req.query.start);
  const end = Number(req.query.end);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    res.status(400).json({ error: 'start and end are required unix timestamps with start < end.' });
    return;
  }

  try {
    const total = await accountsService.getExpensesTotalInRange(start, end);
    res.status(200).json({ total });
  } catch (error) {
    console.error('[accounts] getExpensesTotal failed:', error);
    res.status(500).json({ error: 'Failed to fetch expenses total.' });
  }
}
