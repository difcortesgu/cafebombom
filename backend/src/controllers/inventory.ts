import { InventorySqliteService } from '@/services/inventory';
import type { Request, Response } from 'express';

const inventoryService = new InventorySqliteService();

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  try {
    const data = await inventoryService.getHydrationData();
    res.status(200).json(data);
  } catch (error) {
    console.error('[inventory] getHydrationData failed:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data.' });
  }
}

export async function addIngredient(req: Request, res: Response): Promise<void> {
  const { name, unit, lowStockThreshold, supplierId } = req.body;

  if (!name || !unit || lowStockThreshold == null) {
    res.status(400).json({ error: 'name, unit, and lowStockThreshold are required.' });
    return;
  }

  const normalizedUnit = String(unit).trim().toLowerCase();
  if (!normalizedUnit) {
    res.status(400).json({ error: 'unit is required.' });
    return;
  }

  if (!inventoryService.unitExists(normalizedUnit)) {
    res.status(400).json({ error: 'unit must exist in units catalog.' });
    return;
  }

  try {
    const id = await inventoryService.addIngredient({ name, unit: normalizedUnit, lowStockThreshold, supplierId });
    res.status(201).json({ id });
  } catch (error) {
    console.error('[inventory] addIngredient failed:', error);
    res.status(500).json({ error: 'Failed to create ingredient.' });
  }
}

export async function updateIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, unit, low_stock_threshold, supplier_id } = req.body;

  let normalizedUnit: string | undefined;
  if (unit !== undefined) {
    normalizedUnit = String(unit).trim().toLowerCase();
    if (!normalizedUnit) {
      res.status(400).json({ error: 'unit cannot be empty.' });
      return;
    }

    if (!inventoryService.unitExists(normalizedUnit)) {
      res.status(400).json({ error: 'unit must exist in units catalog.' });
      return;
    }
  }

  try {
    await inventoryService.updateIngredient({ id, name, unit: normalizedUnit, low_stock_threshold, supplier_id });
    res.status(204).send();
  } catch (error) {
    console.error('[inventory] updateIngredient failed:', error);
    res.status(500).json({ error: 'Failed to update ingredient.' });
  }
}

export async function addSupplier(req: Request, res: Response): Promise<void> {
  const { name, phone, notes } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required.' });
    return;
  }

  try {
    const id = await inventoryService.addSupplier({ name, phone, notes });
    if (!id) {
      res.status(409).json({ error: 'A supplier with that name already exists.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    console.error('[inventory] addSupplier failed:', error);
    res.status(500).json({ error: 'Failed to create supplier.' });
  }
}

export async function addUnit(req: Request, res: Response): Promise<void> {
  const { name } = req.body;
  const normalizedName = String(name ?? '').trim().toLowerCase();

  if (!normalizedName) {
    res.status(400).json({ error: 'name is required.' });
    return;
  }

  try {
    const unit = await inventoryService.addUnit({ name: normalizedName });
    if (!unit) {
      res.status(409).json({ error: 'A unit with that name already exists.' });
      return;
    }

    res.status(201).json(unit);
  } catch (error) {
    console.error('[inventory] addUnit failed:', error);
    res.status(500).json({ error: 'Failed to create unit.' });
  }
}

export async function deleteUnit(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;

  if (!id) {
    res.status(400).json({ error: 'id is required.' });
    return;
  }

  try {
    const result = await inventoryService.deleteUnit({ id });
    if (result === 'not-found') {
      res.status(404).json({ error: 'Unit not found.' });
      return;
    }

    if (result === 'in-use') {
      res.status(409).json({ error: 'Cannot delete a unit that is already used by ingredients.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('[inventory] deleteUnit failed:', error);
    res.status(500).json({ error: 'Failed to delete unit.' });
  }
}

export async function addRestock(req: Request, res: Response): Promise<void> {
  const { ingredientId, quantityAdded, cost, supplierId, paymentMethod } = req.body;

  if (!ingredientId || quantityAdded == null || cost == null || !paymentMethod) {
    res.status(400).json({ error: 'ingredientId, quantityAdded, cost, and paymentMethod are required.' });
    return;
  }

  if (paymentMethod !== 'cash' && paymentMethod !== 'card' && paymentMethod !== 'transfer') {
    res.status(400).json({ error: 'paymentMethod must be cash, card, or transfer.' });
    return;
  }

  try {
    const id = await inventoryService.addRestock({ ingredientId, quantityAdded, cost, supplierId, paymentMethod });
    res.status(201).json({ id });
  } catch (error) {
    console.error('[inventory] addRestock failed:', error);
    res.status(500).json({ error: 'Failed to create restock entry.' });
  }
}
