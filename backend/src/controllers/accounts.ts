import type { Request, Response } from 'express';
import type { AuthenticatedRequestUser } from '../middleware/auth';
import { accountsService } from '../services';
import {
  validateAddAdjustment,
  validateAddEmployee,
  validateAddExpense,
  validateAddPayroll,
  validateCloseCashRegister,
  validateDateRange,
  validateGetAdjustments,
  validateOpenCashRegister,
  validateUpdateEmployee,
} from '../validators/accounts';

type AuthenticatedRequest = Request & { auth: AuthenticatedRequestUser };

// Unexpected errors thrown here propagate to the central error handler
// (see utils/errors.ts), which logs them and responds with a 500.

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  const data = await accountsService.getHydrationData();
  res.status(200).json(data);
}

export async function addExpense(req: Request, res: Response): Promise<void> {
  const v = validateAddExpense(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { category, amount, description, dateUnix, paymentMethodId } = v.data;

  const id = await accountsService.addExpense({ category, amount, description, dateUnix, paymentMethodId });
  res.status(201).json({ id });
}

export async function addEmployee(req: Request, res: Response): Promise<void> {
  const v = validateAddEmployee(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, salaryType, rate } = v.data;

  const id = await accountsService.addEmployee({ name, salaryType, rate });
  if (!id) {
    res.status(409).json({ error: 'An employee with that name already exists.' });
    return;
  }
  res.status(201).json({ id });
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const v = validateUpdateEmployee({ ...req.body as Record<string, unknown>, id: req.params['id'] });
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const updated = await accountsService.updateEmployee(v.data);
  if (!updated) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }
  res.status(200).json({ ok: true });
}

export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  const id = String(req.params['id'] ?? '');
  if (!id) {
    res.status(400).json({ error: 'id is required.' });
    return;
  }
  const deleted = await accountsService.deleteEmployee(id);
  if (!deleted) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }
  res.status(200).json({ ok: true });
}

export async function addPayroll(req: Request, res: Response): Promise<void> {
  const v = validateAddPayroll(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { employeeId, periodStart, periodEnd, amount, paymentMethodId } = v.data;

  const id = await accountsService.addPayroll({ employeeId, periodStart, periodEnd, amount, paymentMethodId });
  res.status(201).json({ id });
}

export async function getExpensesTotal(req: Request, res: Response): Promise<void> {
  const v = validateDateRange(req.query as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { start, end } = v.data;

  const total = await accountsService.getExpensesTotalInRange(start, end);
  res.status(200).json({ total });
}

export async function getTodayCashRegister(req: Request, res: Response): Promise<void> {
  const session = await accountsService.getTodayCashRegister();
  res.status(200).json({ session });
}

export async function getTodayCashRegisterSummary(req: Request, res: Response): Promise<void> {
  const summary = await accountsService.getTodayCashRegisterSummary();
  res.status(200).json({ summary });
}

export async function openCashRegister(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const v = validateOpenCashRegister(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { openingAmount, notes } = v.data;

  const id = await accountsService.openCashRegister({ openingAmount, notes, userId });
  res.status(201).json({ id });
}

export async function closeCashRegister(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const v = validateCloseCashRegister(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { sessionId, closingAmount, notes } = v.data;

  await accountsService.closeCashRegister({ sessionId, closingAmount, notes, userId });
  res.status(200).json({ ok: true });
}

export async function addCashRegisterAdjustment(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const v = validateAddAdjustment(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { sessionId, amount, reason } = v.data;

  const id = await accountsService.addCashRegisterAdjustment({ sessionId, amount, reason, adjustedBy: userId });
  res.status(201).json({ id });
}

export async function getCashRegisterAdjustments(req: Request, res: Response): Promise<void> {
  const v = validateGetAdjustments(req.params as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { sessionId } = v.data;

  const adjustments = await accountsService.getCashRegisterAdjustments(sessionId);
  res.status(200).json({ adjustments });
}

export async function getCashRegisterHistory(req: Request, res: Response): Promise<void> {
  const history = await accountsService.getCashRegisterHistory();
  res.status(200).json({ history });
}
