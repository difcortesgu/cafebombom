import { inventoryService } from '../services';
import {
  addIngredientSchema,
  addRestockSchema,
  addSupplierSchema,
  addUnitSchema,
  updateIngredientSchema,
  updateSupplierSchema,
} from '../validators/inventory';
import type { Request, Response } from 'express';

// Unexpected errors thrown here propagate to the central error handler
// (see utils/errors.ts), which logs them and responds with a 500.

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  const data = await inventoryService.getHydrationData();
  res.status(200).json(data);
}

export async function addIngredient(req: Request, res: Response): Promise<void> {
  const { name, unit, lowStockThreshold, supplierId } = addIngredientSchema.parse(req.body);

  if (!inventoryService.unitExists(unit)) {
    res.status(400).json({ error: 'unit must exist in units catalog.' });
    return;
  }

  const id = await inventoryService.addIngredient({ name, unit, lowStockThreshold, supplierId });
  res.status(201).json({ id });
}

export async function updateIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, unit, low_stock_threshold, supplier_id } = updateIngredientSchema.parse(req.body);

  if (unit !== undefined && !inventoryService.unitExists(unit)) {
    res.status(400).json({ error: 'unit must exist in units catalog.' });
    return;
  }

  await inventoryService.updateIngredient({ id, name, unit, low_stock_threshold, supplier_id });
  res.status(204).send();
}

export async function addSupplier(req: Request, res: Response): Promise<void> {
  const { name, phone, notes } = addSupplierSchema.parse(req.body);

  const id = await inventoryService.addSupplier({ name, phone, notes });
  if (!id) {
    res.status(409).json({ error: 'A supplier with that name already exists.' });
    return;
  }
  res.status(201).json({ id });
}

export async function updateSupplier(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, phone, notes } = updateSupplierSchema.parse(req.body);

  await inventoryService.updateSupplier({ id, name, phone, notes });
  res.status(204).end();
}

export async function deleteIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const deleted = await inventoryService.deleteIngredient(id);
  if (!deleted) {
    res.status(404).json({ error: 'Ingredient not found.' });
    return;
  }
  res.status(200).json({ ok: true });
}

export async function setIngredientActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'isActive (boolean) is required.' });
    return;
  }
  const updated = await inventoryService.setIngredientActive(id, isActive);
  if (!updated) {
    res.status(404).json({ error: 'Ingredient not found.' });
    return;
  }
  res.status(200).json({ ok: true });
}

export async function deleteSupplier(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const deleted = await inventoryService.deleteSupplier(id);
  if (!deleted) {
    res.status(404).json({ error: 'Supplier not found.' });
    return;
  }
  res.status(200).json({ ok: true });
}

export async function setSupplierActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'isActive (boolean) is required.' });
    return;
  }
  const updated = await inventoryService.setSupplierActive(id, isActive);
  if (!updated) {
    res.status(404).json({ error: 'Supplier not found.' });
    return;
  }
  res.status(200).json({ ok: true });
}

export async function addUnit(req: Request, res: Response): Promise<void> {
  const { name } = addUnitSchema.parse(req.body);

  const unit = await inventoryService.addUnit({ name });
  if (!unit) {
    res.status(409).json({ error: 'A unit with that name already exists.' });
    return;
  }

  res.status(201).json(unit);
}

export async function deleteUnit(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  if (!id) {
    res.status(400).json({ error: 'id is required.' });
    return;
  }

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
}

export async function addRestock(req: Request, res: Response): Promise<void> {
  const { ingredientId, quantityAdded, cost, supplierId, paymentMethodId } = addRestockSchema.parse(req.body);

  const id = await inventoryService.addRestock({ ingredientId, quantityAdded, cost, supplierId, paymentMethodId });
  res.status(201).json({ id });
}
