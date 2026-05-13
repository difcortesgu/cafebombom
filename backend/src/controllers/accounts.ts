import type { AuthenticatedRequestUser } from '@/middleware/auth';
import { AccountsSqliteService } from '@/services/accounts';
import type { Request, Response } from 'express';

type AuthenticatedRequest = Request & { auth: AuthenticatedRequestUser };

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
  const { category, amount, description, dateUnix, paymentMethod } = req.body;

  if (!category || amount == null || !paymentMethod) {
    res.status(400).json({ error: 'category, amount, and paymentMethod are required.' });
    return;
  }

  if (paymentMethod !== 'cash' && paymentMethod !== 'card' && paymentMethod !== 'transfer') {
    res.status(400).json({ error: 'paymentMethod must be cash, card, or transfer.' });
    return;
  }

  try {
    const id = await accountsService.addExpense({ category, amount, description, dateUnix, paymentMethod });
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
  const { employeeId, periodStart, periodEnd, amount, paymentMethod } = req.body;

  if (!employeeId || periodStart == null || periodEnd == null || amount == null || !paymentMethod) {
    res.status(400).json({ error: 'employeeId, periodStart, periodEnd, amount, and paymentMethod are required.' });
    return;
  }

  if (paymentMethod !== 'cash' && paymentMethod !== 'card' && paymentMethod !== 'transfer') {
    res.status(400).json({ error: 'paymentMethod must be cash, card, or transfer.' });
    return;
  }

  try {
    const id = await accountsService.addPayroll({ employeeId, periodStart, periodEnd, amount, paymentMethod });
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

export async function getTodayCashRegister(req: Request, res: Response): Promise<void> {
  try {
    const session = await accountsService.getTodayCashRegister();
    res.status(200).json({ session });
  } catch (error) {
    console.error('[accounts] getTodayCashRegister failed:', error);
    res.status(500).json({ error: 'Failed to fetch cash register session.' });
  }
}

export async function openCashRegister(req: Request, res: Response): Promise<void> {
  const { openingAmount, notes } = req.body;
  const userId = (req as AuthenticatedRequest).auth.userId;

  if (openingAmount == null) {
    res.status(400).json({ error: 'openingAmount is required.' });
    return;
  }

  try {
    const id = await accountsService.openCashRegister({ openingAmount, notes, userId });
    res.status(201).json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open cash register.';
    if (message.includes('already open')) {
      res.status(409).json({ error: message });
      return;
    }
    console.error('[accounts] openCashRegister failed:', error);
    res.status(500).json({ error: message });
  }
}

export async function closeCashRegister(req: Request, res: Response): Promise<void> {
  const { sessionId, closingAmount, notes } = req.body;
  const userId = (req as AuthenticatedRequest).auth.userId;

  if (!sessionId || closingAmount == null) {
    res.status(400).json({ error: 'sessionId and closingAmount are required.' });
    return;
  }

  try {
    await accountsService.closeCashRegister({ sessionId, closingAmount, notes, userId });
    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to close cash register.';
    if (message.includes('not found') || message.includes('already closed')) {
      res.status(409).json({ error: message });
      return;
    }
    console.error('[accounts] closeCashRegister failed:', error);
    res.status(500).json({ error: message });
  }
}
