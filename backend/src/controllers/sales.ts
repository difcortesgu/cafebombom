import { SalesSqliteService } from '@/services/sales';
import type { DashboardTrendBucket } from '@/types/sales';
import type { PaymentMethod } from '@/types/types';
import type { Request, Response } from 'express';

const salesService = new SalesSqliteService();

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  try {
    const data = await salesService.getHydrationData();
    res.status(200).json(data);
  } catch (error) {
    console.error('[sales] getHydrationData failed:', error);
    res.status(500).json({ error: 'Failed to fetch sales data.' });
  }
}

export async function createSale(req: Request, res: Response): Promise<void> {
  const { staffId, items, tableId, globalDiscountId, orderTypeSurcharge } = req.body;

  if (!staffId || !Array.isArray(items) || items.length === 0 || !tableId) {
    res.status(400).json({ error: 'staffId, items (non-empty), and tableId are required.' });
    return;
  }

  try {
    const id = await salesService.createSale({ staffId, items, tableId, globalDiscountId, orderTypeSurcharge });
    if (!id) {
      res.status(422).json({ error: 'Could not create sale. Items may be empty.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    console.error('[sales] createSale failed:', error);
    res.status(500).json({ error: 'Failed to create sale.' });
  }
}

export async function updateDraftOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { staffId, items, tableId, globalDiscountId, orderTypeSurcharge } = req.body;

  if (!staffId || !Array.isArray(items) || items.length === 0 || !tableId) {
    res.status(400).json({ error: 'staffId, items (non-empty), and tableId are required.' });
    return;
  }

  try {
    await salesService.updateDraftOrder({ orderId: id, staffId, items, tableId, globalDiscountId, orderTypeSurcharge });
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('not found') || msg.includes('draft')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] updateDraftOrder failed:', error);
    res.status(500).json({ error: 'Failed to update order.' });
  }
}

export async function getSaleItems(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    const items = await salesService.getSaleItems(id);
    res.status(200).json({ items });
  } catch (error) {
    console.error('[sales] getSaleItems failed:', error);
    res.status(500).json({ error: 'Failed to fetch sale items.' });
  }
}

export async function addItemToOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { item } = req.body;

  if (!item || !item.productId || item.quantity == null || item.unitPrice == null) {
    res.status(400).json({ error: 'item with productId, quantity, and unitPrice is required.' });
    return;
  }

  try {
    const itemId = await salesService.addItemToOrder({ orderId: id, item });
    res.status(201).json({ id: itemId });
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('not found') || msg.includes('draft')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] addItemToOrder failed:', error);
    res.status(500).json({ error: 'Failed to add item to order.' });
  }
}

export async function removeItemFromOrder(req: Request, res: Response): Promise<void> {
  const { id, itemId } = req.params as Record<string, string>;

  try {
    await salesService.removeItemFromOrder({ orderId: id, saleItemId: itemId });
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('not found') || msg.includes('draft') || msg.includes('last item')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] removeItemFromOrder failed:', error);
    res.status(500).json({ error: 'Failed to remove item from order.' });
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
    console.error('[sales] getSalePricingSummary failed:', error);
    res.status(500).json({ error: 'Failed to fetch pricing summary.' });
  }
}

export async function sendToKitchen(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.sendToKitchen(id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('not found') || msg.includes('status')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] sendToKitchen failed:', error);
    res.status(500).json({ error: 'Failed to send order to kitchen.' });
  }
}

export async function markOrderReady(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.markOrderReady(id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('not found') || msg.includes('status')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] markOrderReady failed:', error);
    res.status(500).json({ error: 'Failed to mark order as ready.' });
  }
}

export async function markOrderPaid(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { paymentMethod } = req.body as { paymentMethod?: PaymentMethod };

  const validMethods: PaymentMethod[] = ['cash', 'card', 'transfer'];
  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    res.status(400).json({ error: 'paymentMethod must be cash, card, or transfer.' });
    return;
  }

  try {
    await salesService.markOrderPaid(id, paymentMethod);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('not found') || msg.includes('status')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] markOrderPaid failed:', error);
    res.status(500).json({ error: 'Failed to mark order as paid.' });
  }
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.cancelOrder(id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('not found') || msg.includes('status')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] cancelOrder failed:', error);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
}

// ── Discounts ────────────────────────────────────────────────────────────────

export async function getDiscounts(req: Request, res: Response): Promise<void> {
  try {
    const data = await salesService.getDiscounts();
    res.status(200).json(data);
  } catch (error) {
    console.error('[sales] getDiscounts failed:', error);
    res.status(500).json({ error: 'Failed to fetch discounts.' });
  }
}

export async function createDiscount(req: Request, res: Response): Promise<void> {
  const { name, scope, productId, type, value, startsAt, endsAt, isActive } = req.body;

  if (!name || !scope || !type || value == null || isActive == null) {
    res.status(400).json({ error: 'name, scope, type, value, and isActive are required.' });
    return;
  }

  try {
    const id = await salesService.createDiscount({ name, scope, productId, type, value, startsAt, endsAt, isActive });
    res.status(201).json({ id });
  } catch (error) {
    console.error('[sales] createDiscount failed:', error);
    res.status(500).json({ error: 'Failed to create discount.' });
  }
}

export async function updateDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, scope, productId, type, value, startsAt, endsAt, isActive } = req.body;

  if (!name || !scope || !type || value == null || isActive == null) {
    res.status(400).json({ error: 'name, scope, type, value, and isActive are required.' });
    return;
  }

  try {
    await salesService.updateDiscount({ id, name, scope, productId, type, value, startsAt, endsAt, isActive });
    res.status(204).send();
  } catch (error) {
    console.error('[sales] updateDiscount failed:', error);
    res.status(500).json({ error: 'Failed to update discount.' });
  }
}

export async function deleteDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.deleteDiscount(id);
    res.status(204).send();
  } catch (error) {
    console.error('[sales] deleteDiscount failed:', error);
    res.status(500).json({ error: 'Failed to delete discount.' });
  }
}

// ── Tables ───────────────────────────────────────────────────────────────────

export async function getTables(req: Request, res: Response): Promise<void> {
  try {
    const data = await salesService.getTables();
    res.status(200).json(data);
  } catch (error) {
    console.error('[sales] getTables failed:', error);
    res.status(500).json({ error: 'Failed to fetch tables.' });
  }
}

export async function createTable(req: Request, res: Response): Promise<void> {
  const { name, tableType } = req.body;

  if (!name || !tableType) {
    res.status(400).json({ error: 'name and tableType are required.' });
    return;
  }

  try {
    const id = await salesService.createTable({ name, tableType });
    if (!id) {
      res.status(409).json({ error: 'A table with that name already exists.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    console.error('[sales] createTable failed:', error);
    res.status(500).json({ error: 'Failed to create table.' });
  }
}

export async function updateTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, tableType } = req.body;

  if (!name || !tableType) {
    res.status(400).json({ error: 'name and tableType are required.' });
    return;
  }

  try {
    await salesService.updateTable({ id, name, tableType });
    res.status(204).send();
  } catch (error) {
    console.error('[sales] updateTable failed:', error);
    res.status(500).json({ error: 'Failed to update table.' });
  }
}

export async function deleteTable(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await salesService.deleteTable(id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('linked sales')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[sales] deleteTable failed:', error);
    res.status(500).json({ error: 'Failed to delete table.' });
  }
}

// ── Surcharges ───────────────────────────────────────────────────────────────

export async function getSurchargeConfig(req: Request, res: Response): Promise<void> {
  try {
    const config = await salesService.getOrderTypeSurchargeConfig();
    res.status(200).json(config);
  } catch (error) {
    console.error('[sales] getSurchargeConfig failed:', error);
    res.status(500).json({ error: 'Failed to fetch surcharge config.' });
  }
}

export async function saveSurchargeConfig(req: Request, res: Response): Promise<void> {
  const { toGoSurcharge, deliverySurcharge } = req.body;

  if (toGoSurcharge == null || deliverySurcharge == null) {
    res.status(400).json({ error: 'toGoSurcharge and deliverySurcharge are required.' });
    return;
  }

  try {
    await salesService.saveOrderTypeSurchargeConfig({ toGoSurcharge, deliverySurcharge });
    res.status(204).send();
  } catch (error) {
    console.error('[sales] saveSurchargeConfig failed:', error);
    res.status(500).json({ error: 'Failed to save surcharge config.' });
  }
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  const start = Number(req.query.start);
  const end = Number(req.query.end);
  const bucket = (req.query.bucket as DashboardTrendBucket) ?? 'day';

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    res.status(400).json({ error: 'start and end are required unix timestamps with start < end.' });
    return;
  }

  const validBuckets: DashboardTrendBucket[] = ['hour', 'day'];
  if (!validBuckets.includes(bucket)) {
    res.status(400).json({ error: 'bucket must be hour or day.' });
    return;
  }

  try {
    const summary = await salesService.getDashboardSummary(start, end, bucket);
    res.status(200).json(summary);
  } catch (error) {
    console.error('[sales] getDashboardSummary failed:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary.' });
  }
}

export async function getRevenueInRange(req: Request, res: Response): Promise<void> {
  const start = Number(req.query.start);
  const end = Number(req.query.end);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    res.status(400).json({ error: 'start and end are required unix timestamps with start < end.' });
    return;
  }

  try {
    const revenue = await salesService.getRevenueInRange(start, end);
    res.status(200).json({ revenue });
  } catch (error) {
    console.error('[sales] getRevenueInRange failed:', error);
    res.status(500).json({ error: 'Failed to fetch revenue.' });
  }
}

export async function getTopSelling(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  try {
    const data = await salesService.getTopSelling(limit);
    res.status(200).json(data);
  } catch (error) {
    console.error('[sales] getTopSelling failed:', error);
    res.status(500).json({ error: 'Failed to fetch top-selling products.' });
  }
}
