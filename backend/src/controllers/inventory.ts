import { inventoryService } from '../services';
import { handleControllerError } from '../utils/errors';
import {
  validateAddIngredient,
  validateAddRestock,
  validateAddSupplier,
  validateAddUnit,
  validateDeleteUnit,
  validateUpdateIngredient,
  validateUpdateSupplier,
} from '../validators/inventory';
import type { Request, Response } from 'express';


export async function getHydrationData(req: Request, res: Response): Promise<void> {
  try {
    const data = await inventoryService.getHydrationData();
    res.status(200).json(data);
  } catch (error) {
    handleControllerError(error, res, { label: '[inventory] getHydrationData', fallbackMessage: 'Failed to fetch inventory data.' });
  }
}

export async function addIngredient(req: Request, res: Response): Promise<void> {
  const v = validateAddIngredient(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, unit, lowStockThreshold, supplierId } = v.data;

  if (!inventoryService.unitExists(unit)) {
    res.status(400).json({ error: 'unit must exist in units catalog.' });
    return;
  }

  try {
    const id = await inventoryService.addIngredient({ name, unit, lowStockThreshold, supplierId });
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[inventory] addIngredient', fallbackMessage: 'Failed to create ingredient.' });
  }
}

export async function updateIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validateUpdateIngredient(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, unit, low_stock_threshold, supplier_id } = v.data;

  if (unit !== undefined && !inventoryService.unitExists(unit)) {
    res.status(400).json({ error: 'unit must exist in units catalog.' });
    return;
  }

  try {
    await inventoryService.updateIngredient({ id, name, unit, low_stock_threshold, supplier_id });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[inventory] updateIngredient', fallbackMessage: 'Failed to update ingredient.' });
  }
}

export async function addSupplier(req: Request, res: Response): Promise<void> {
  const v = validateAddSupplier(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, phone, notes } = v.data;

  try {
    const id = await inventoryService.addSupplier({ name, phone, notes });
    if (!id) {
      res.status(409).json({ error: 'A supplier with that name already exists.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[inventory] addSupplier', fallbackMessage: 'Failed to create supplier.' });
  }
}

export async function updateSupplier(req: Request, res: Response): Promise<void> {
  const v = validateUpdateSupplier(req.params as Record<string, unknown>, req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { id, name, phone, notes } = v.data;

  try {
    await inventoryService.updateSupplier({ id, name, phone, notes });
    res.status(204).end();
  } catch (error) {
    handleControllerError(error, res, { label: '[inventory] updateSupplier', fallbackMessage: 'Failed to update supplier.' });
  }
}

export async function addUnit(req: Request, res: Response): Promise<void> {
  const v = validateAddUnit(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name } = v.data;

  try {
    const unit = await inventoryService.addUnit({ name });
    if (!unit) {
      res.status(409).json({ error: 'A unit with that name already exists.' });
      return;
    }

    res.status(201).json(unit);
  } catch (error) {
    handleControllerError(error, res, { label: '[inventory] addUnit', fallbackMessage: 'Failed to create unit.' });
  }
}

export async function deleteUnit(req: Request, res: Response): Promise<void> {
  const v = validateDeleteUnit(req.params as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { id } = v.data;

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
    handleControllerError(error, res, { label: '[inventory] deleteUnit', fallbackMessage: 'Failed to delete unit.' });
  }
}

export async function addRestock(req: Request, res: Response): Promise<void> {
  const v = validateAddRestock(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { ingredientId, quantityAdded, cost, supplierId, paymentMethodId } = v.data;

  try {
    const id = await inventoryService.addRestock({ ingredientId, quantityAdded, cost, supplierId, paymentMethodId });
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[inventory] addRestock', fallbackMessage: 'Failed to create restock entry.' });
  }
}
