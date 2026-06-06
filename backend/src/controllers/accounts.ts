import type { Request, Response } from 'express';
import type { AuthenticatedRequestUser } from '../middleware/auth';
import { accountsService } from '../services';
import {
  addAdjustmentSchema,
  addExpenseSchema,
  addPayrollSchema,
  closeCashRegisterSchema,
  dateRangeSchema,
  employeeSchema,
  getAdjustmentsSchema,
  openCashRegisterSchema,
} from '../validators/accounts';

type AuthenticatedRequest = Request & { auth: AuthenticatedRequestUser };

// Unexpected errors thrown here propagate to the central error handler
// (see utils/errors.ts), which logs them and responds with a 500.

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  const data = await accountsService.getHydrationData();
  res.status(200).json(data);
}

export async function addExpense(req: Request, res: Response): Promise<void> {
  const { category, amount, description, dateUnix, paymentMethodId } = addExpenseSchema.parse(req.body);

  const id = await accountsService.addExpense({ category, amount, description, dateUnix, paymentMethodId });
  res.status(201).json({ id });
}

export async function addEmployee(req: Request, res: Response): Promise<void> {
  const { name, salaryType, rate } = employeeSchema.parse(req.body);

  const id = await accountsService.addEmployee({ name, salaryType, rate });
  if (!id) {
    res.status(409).json({ error: 'An employee with that name already exists.' });
    return;
  }
  res.status(201).json({ id });
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const id = String(req.params['id'] ?? '');
  if (!id) {
    res.status(400).json({ error: 'id is required.' });
    return;
  }
  const { name, salaryType, rate } = employeeSchema.parse(req.body);
  const updated = await accountsService.updateEmployee({ id, name, salaryType, rate });
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
  const { employeeId, periodStart, periodEnd, amount, paymentMethodId } = addPayrollSchema.parse(req.body);

  const id = await accountsService.addPayroll({ employeeId, periodStart, periodEnd, amount, paymentMethodId });
  res.status(201).json({ id });
}

export async function getExpensesTotal(req: Request, res: Response): Promise<void> {
  const { start, end } = dateRangeSchema.parse(req.query);

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
  const { openingAmount, notes } = openCashRegisterSchema.parse(req.body);

  const id = await accountsService.openCashRegister({ openingAmount, notes, userId });
  res.status(201).json({ id });
}

export async function closeCashRegister(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const { sessionId, closingAmount, notes } = closeCashRegisterSchema.parse(req.body);

  await accountsService.closeCashRegister({ sessionId, closingAmount, notes, userId });
  res.status(200).json({ ok: true });
}

export async function addCashRegisterAdjustment(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const { sessionId, amount, reason } = addAdjustmentSchema.parse(req.body);

  const id = await accountsService.addCashRegisterAdjustment({ sessionId, amount, reason, adjustedBy: userId });
  res.status(201).json({ id });
}

export async function getCashRegisterAdjustments(req: Request, res: Response): Promise<void> {
  const { sessionId } = getAdjustmentsSchema.parse(req.params);

  const adjustments = await accountsService.getCashRegisterAdjustments(sessionId);
  res.status(200).json({ adjustments });
}

export async function getCashRegisterHistory(req: Request, res: Response): Promise<void> {
  const history = await accountsService.getCashRegisterHistory();
  res.status(200).json({ history });
}
