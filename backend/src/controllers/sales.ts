import { salesService } from '@/services';
import { handleControllerError } from '@/utils/errors';
import {
  validateAddItem,
  validateDashboardQuery,
  validateDateRange,
  validateDiscount,
  validateMarkPaid,
  validateOrderPayload,
  validatePartialPayment,
  validateSurchargeConfig,
  validateTablePayload,
} from '@/validators/sales';
import type { Request, Response } from 'express';


export async function getHydrationData(req: Request, res: Response): Promise<void> {
  try {
    const data = await salesService.getHydrationData();
    res.status(200).json(data);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getHydrationData', fallbackMessage: 'Failed to fetch sales data.' });
  }
}

export async function createSale(req: Request, res: Response): Promise<void> {
  const v = validateOrderPayload(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { staffId, items, tableId, globalDiscountId, orderTypeSurcharge } = v.data;

  try {
    const id = await salesService.createSale({ staffId, items, tableId, globalDiscountId, orderTypeSurcharge });
    if (!id) {
      res.status(422).json({ error: 'Could not create sale. Items may be empty.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] createSale', fallbackMessage: 'Failed to create sale.' });
  }
}

export async function updateDraftOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validateOrderPayload(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { staffId, items, tableId, globalDiscountId, orderTypeSurcharge } = v.data;

  try {
    await salesService.updateDraftOrder({ orderId: id, staffId, items, tableId, globalDiscountId, orderTypeSurcharge });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] updateDraftOrder', fallbackMessage: 'Failed to update order.' });
  }
}

export async function getSaleItems(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    const items = await salesService.getSaleItems(id);
    res.status(200).json({ items });
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getSaleItems', fallbackMessage: 'Failed to fetch sale items.' });
  }
}

export async function addItemToOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validateAddItem(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { item } = v.data;

  try {
    const itemId = await salesService.addItemToOrder({ orderId: id, item });
    res.status(201).json({ id: itemId });
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] addItemToOrder', fallbackMessage: 'Failed to add item to order.' });
  }
}

export async function removeItemFromOrder(req: Request, res: Response): Promise<void> {
  const { id, itemId } = req.params as Record<string, string>;

  try {
    await salesService.removeItemFromOrder({ orderId: id, saleItemId: itemId });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] removeItemFromOrder', fallbackMessage: 'Failed to remove item from order.' });
  }
}

export async function getSalePricingSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    const summary = await salesService.getSalePricingSummary(id);
    if (!summary) {
      res.status(404).json({ error: 'Sale not found.' });
      return;
    }
    res.status(200).json(summary);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getSalePricingSummary', fallbackMessage: 'Failed to fetch pricing summary.' });
  }
}

export async function sendToKitchen(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.sendToKitchen(id);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] sendToKitchen', fallbackMessage: 'Failed to send order to kitchen.' });
  }
}

export async function markOrderReady(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.markOrderReady(id);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] markOrderReady', fallbackMessage: 'Failed to mark order as ready.' });
  }
}

export async function markOrderPaid(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validateMarkPaid(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { paymentMethodId } = v.data;

  try {
    await salesService.markOrderPaid(id, paymentMethodId);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] markOrderPaid', fallbackMessage: 'Failed to mark order as paid.' });
  }
}

export async function getSalePaymentBoard(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;

  try {
    const board = await salesService.getSalePaymentBoard(id);
    res.status(200).json(board);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getSalePaymentBoard', fallbackMessage: 'Failed to fetch sale payment board.' });
  }
}

export async function getSalePayments(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;

  try {
    const payments = await salesService.getSalePayments(id);
    res.status(200).json({ payments });
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getSalePayments', fallbackMessage: 'Failed to fetch sale payments.' });
  }
}

export async function createPartialPayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validatePartialPayment(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { paymentMethodId, lines } = v.data;

  try {
    await salesService.createPartialPayment({
      orderId: id,
      paymentMethodId,
      lines,
      paidBy: req.auth?.userId ?? null,
    });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] createPartialPayment', fallbackMessage: 'Failed to create partial payment.' });
  }
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.cancelOrder(id);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] cancelOrder', fallbackMessage: 'Failed to cancel order.' });
  }
}

// ── Discounts ────────────────────────────────────────────────────────────────

export async function getDiscounts(req: Request, res: Response): Promise<void> {
  try {
    const data = await salesService.getDiscounts();
    res.status(200).json(data);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getDiscounts', fallbackMessage: 'Failed to fetch discounts.' });
  }
}

export async function createDiscount(req: Request, res: Response): Promise<void> {
  const v = validateDiscount(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, scope, productId, type, value, startsAt, endsAt, isActive } = v.data;

  try {
    const id = await salesService.createDiscount({ name, scope, productId, type, value, startsAt, endsAt, isActive });
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] createDiscount', fallbackMessage: 'Failed to create discount.' });
  }
}

export async function updateDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validateDiscount(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, scope, productId, type, value, startsAt, endsAt, isActive } = v.data;

  try {
    await salesService.updateDiscount({ id, name, scope, productId, type, value, startsAt, endsAt, isActive });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] updateDiscount', fallbackMessage: 'Failed to update discount.' });
  }
}

export async function deleteDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.deleteDiscount(id);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] deleteDiscount', fallbackMessage: 'Failed to delete discount.' });
  }
}

// ── Tables ───────────────────────────────────────────────────────────────────

export async function getTables(req: Request, res: Response): Promise<void> {
  try {
    const data = await salesService.getTables();
    res.status(200).json(data);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getTables', fallbackMessage: 'Failed to fetch tables.' });
  }
}

export async function createTable(req: Request, res: Response): Promise<void> {
  const v = validateTablePayload(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, tableType } = v.data;

  try {
    const id = await salesService.createTable({ name, tableType });
    if (!id) {
      res.status(409).json({ error: 'A table with that name already exists.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] createTable', fallbackMessage: 'Failed to create table.' });
  }
}

export async function updateTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validateTablePayload(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, tableType } = v.data;

  try {
    await salesService.updateTable({ id, name, tableType });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] updateTable', fallbackMessage: 'Failed to update table.' });
  }
}

export async function deleteTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.deleteTable(id);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] deleteTable', fallbackMessage: 'Failed to delete table.' });
  }
}

// ── Surcharges ───────────────────────────────────────────────────────────────

export async function getSurchargeConfig(req: Request, res: Response): Promise<void> {
  try {
    const config = await salesService.getOrderTypeSurchargeConfig();
    res.status(200).json(config);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getSurchargeConfig', fallbackMessage: 'Failed to fetch surcharge config.' });
  }
}

export async function saveSurchargeConfig(req: Request, res: Response): Promise<void> {
  const v = validateSurchargeConfig(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { toGoSurcharge, deliverySurcharge } = v.data;

  try {
    await salesService.saveOrderTypeSurchargeConfig({ toGoSurcharge, deliverySurcharge });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] saveSurchargeConfig', fallbackMessage: 'Failed to save surcharge config.' });
  }
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  const v = validateDashboardQuery(req.query as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { start, end, bucket } = v.data;

  try {
    const summary = await salesService.getDashboardSummary(start, end, bucket);
    res.status(200).json(summary);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getDashboardSummary', fallbackMessage: 'Failed to fetch dashboard summary.' });
  }
}

export async function getRevenueInRange(req: Request, res: Response): Promise<void> {
  const v = validateDateRange(req.query as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { start, end } = v.data;

  try {
    const revenue = await salesService.getRevenueInRange(start, end);
    res.status(200).json({ revenue });
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getRevenueInRange', fallbackMessage: 'Failed to fetch revenue.' });
  }
}

export async function getTopSelling(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  try {
    const data = await salesService.getTopSelling(limit);
    res.status(200).json(data);
  } catch (error) {
    handleControllerError(error, res, { label: '[sales] getTopSelling', fallbackMessage: 'Failed to fetch top-selling products.' });
  }
}
