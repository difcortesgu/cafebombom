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
  const { name, unit, quantity, lowStockThreshold, supplierId } = req.body;

  if (!name || !unit || quantity == null || lowStockThreshold == null) {
    res.status(400).json({ error: 'name, unit, quantity, and lowStockThreshold are required.' });
    return;
  }

  try {
    const id = await inventoryService.addIngredient({ name, unit, quantity, lowStockThreshold, supplierId });
    res.status(201).json({ id });
  } catch (error) {
    console.error('[inventory] addIngredient failed:', error);
    res.status(500).json({ error: 'Failed to create ingredient.' });
  }
}

export async function updateIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, unit, quantity, low_stock_threshold, supplier_id } = req.body;

  try {
    await inventoryService.updateIngredient({ id, name, unit, quantity, low_stock_threshold, supplier_id });
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

export async function addRestock(req: Request, res: Response): Promise<void> {
  const { ingredientId, quantityAdded, cost, supplierId } = req.body;

  if (!ingredientId || quantityAdded == null || cost == null) {
    res.status(400).json({ error: 'ingredientId, quantityAdded, and cost are required.' });
    return;
  }

  try {
    const id = await inventoryService.addRestock({ ingredientId, quantityAdded, cost, supplierId });
    res.status(201).json({ id });
  } catch (error) {
    console.error('[inventory] addRestock failed:', error);
    res.status(500).json({ error: 'Failed to create restock entry.' });
  }
}
