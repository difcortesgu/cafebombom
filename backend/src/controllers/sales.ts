import { salesService } from '../services';
import {
  addItemSchema,
  dashboardQuerySchema,
  dateRangeSchema,
  discountSchema,
  markPaidSchema,
  orderSchema,
  partialPaymentSchema,
  surchargeConfigSchema,
  tableSchema,
} from '../validators/sales';
import type { Request, Response } from 'express';

// Unexpected errors thrown here propagate to the central error handler
// (see utils/errors.ts), which logs them and responds with a 500.

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  const data = await salesService.getHydrationData();
  res.status(200).json(data);
}

export async function createSale(req: Request, res: Response): Promise<void> {
  const { staffId, items, tableId, globalDiscountId, orderTypeSurcharge } = orderSchema.parse(req.body);

  const id = await salesService.createSale({ staffId, items, tableId, globalDiscountId, orderTypeSurcharge });
  if (!id) {
    res.status(422).json({ error: 'Could not create sale. Items may be empty.' });
    return;
  }
  res.status(201).json({ id });
}

export async function updateDraftOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { staffId, items, tableId, globalDiscountId, orderTypeSurcharge } = orderSchema.parse(req.body);

  await salesService.updateDraftOrder({ orderId: id, staffId, items, tableId, globalDiscountId, orderTypeSurcharge });
  res.status(204).send();
}

export async function getSaleItems(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const items = await salesService.getSaleItems(id);
  res.status(200).json({ items });
}

export async function addItemToOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { item } = addItemSchema.parse(req.body);

  const itemId = await salesService.addItemToOrder({ orderId: id, item });
  res.status(201).json({ id: itemId });
}

export async function removeItemFromOrder(req: Request, res: Response): Promise<void> {
  const { id, itemId } = req.params as Record<string, string>;

  await salesService.removeItemFromOrder({ orderId: id, saleItemId: itemId });
  res.status(204).send();
}

export async function getSalePricingSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const summary = await salesService.getSalePricingSummary(id);
  if (!summary) {
    res.status(404).json({ error: 'Sale not found.' });
    return;
  }
  res.status(200).json(summary);
}

export async function sendToKitchen(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await salesService.sendToKitchen(id);
  res.status(204).send();
}

export async function markOrderReady(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await salesService.markOrderReady(id);
  res.status(204).send();
}

export async function markOrderPaid(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { paymentMethodId, tipAmount } = markPaidSchema.parse(req.body);

  await salesService.markOrderPaid(id, paymentMethodId, tipAmount);
  res.status(204).send();
}

export async function getSalePaymentBoard(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;

  const board = await salesService.getSalePaymentBoard(id);
  res.status(200).json(board);
}

export async function getSalePayments(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;

  const payments = await salesService.getSalePayments(id);
  res.status(200).json({ payments });
}

export async function createPartialPayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { paymentMethodId, lines, tipAmount } = partialPaymentSchema.parse(req.body);

  await salesService.createPartialPayment({
    orderId: id,
    paymentMethodId,
    lines,
    paidBy: req.auth?.userId ?? null,
    tipAmount,
  });
  res.status(204).send();
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await salesService.cancelOrder(id);
  res.status(204).send();
}

// ── Discounts ────────────────────────────────────────────────────────────────

export async function getDiscounts(req: Request, res: Response): Promise<void> {
  const data = await salesService.getDiscounts();
  res.status(200).json(data);
}

export async function createDiscount(req: Request, res: Response): Promise<void> {
  const { name, scope, productId, type, value, startsAt, endsAt, daysOfWeek, daysOfMonth, hourStart, hourEnd, isActive } = discountSchema.parse(req.body);

  const id = await salesService.createDiscount({ name, scope, productId, type, value, startsAt, endsAt, daysOfWeek, daysOfMonth, hourStart, hourEnd, isActive });
  res.status(201).json({ id });
}

export async function updateDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, scope, productId, type, value, startsAt, endsAt, daysOfWeek, daysOfMonth, hourStart, hourEnd, isActive } = discountSchema.parse(req.body);

  await salesService.updateDiscount({ id, name, scope, productId, type, value, startsAt, endsAt, daysOfWeek, daysOfMonth, hourStart, hourEnd, isActive });
  res.status(204).send();
}

export async function deleteDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await salesService.deleteDiscount(id);
  res.status(204).send();
}

// ── Tables ───────────────────────────────────────────────────────────────────

export async function getTables(req: Request, res: Response): Promise<void> {
  const data = await salesService.getTables();
  res.status(200).json(data);
}

export async function createTable(req: Request, res: Response): Promise<void> {
  const { name, tableType } = tableSchema.parse(req.body);

  const id = await salesService.createTable({ name, tableType });
  if (!id) {
    res.status(409).json({ error: 'A table with that name already exists.' });
    return;
  }
  res.status(201).json({ id });
}

export async function updateTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, tableType } = tableSchema.parse(req.body);

  await salesService.updateTable({ id, name, tableType });
  res.status(204).send();
}

export async function deleteTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await salesService.deleteTable(id);
  res.status(204).send();
}

export async function setTableActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'isActive (boolean) is required.' });
    return;
  }
  const updated = await salesService.setTableActive(id, isActive);
  if (!updated) {
    res.status(404).json({ error: 'Table not found.' });
    return;
  }
  res.status(200).json({ ok: true });
}

// ── Surcharges ───────────────────────────────────────────────────────────────

export async function getSurchargeConfig(req: Request, res: Response): Promise<void> {
  const config = await salesService.getOrderTypeSurchargeConfig();
  res.status(200).json(config);
}

export async function saveSurchargeConfig(req: Request, res: Response): Promise<void> {
  const { toGoSurcharge, deliverySurcharge } = surchargeConfigSchema.parse(req.body);

  await salesService.saveOrderTypeSurchargeConfig({ toGoSurcharge, deliverySurcharge });
  res.status(204).send();
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  const { start, end, bucket } = dashboardQuerySchema.parse(req.query);

  const summary = await salesService.getDashboardSummary(start, end, bucket);
  res.status(200).json(summary);
}

export async function getRevenueInRange(req: Request, res: Response): Promise<void> {
  const { start, end } = dateRangeSchema.parse(req.query);

  const revenue = await salesService.getRevenueInRange(start, end);
  res.status(200).json({ revenue });
}

export async function getTopSelling(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const data = await salesService.getTopSelling(limit);
  res.status(200).json(data);
}
