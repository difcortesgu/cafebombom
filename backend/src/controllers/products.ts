import { productsService } from '../services';
import { handleControllerError } from '../utils/errors';
import {
  validateAddCategory,
  validateCreateProduct,
  validateSetAdditionalIngredient,
  validateSetIngredient,
} from '../validators/products';
import type { Request, Response } from 'express';


export async function getHydrationData(req: Request, res: Response): Promise<void> {
  try {
    const data = await productsService.getHydrationData();
    res.status(200).json(data);
  } catch (error) {
    handleControllerError(error, res, { label: '[products] getHydrationData', fallbackMessage: 'Failed to fetch products data.' });
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const v = validateCreateProduct(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name, categoryId, price, imageUri, recipe, additionalIngredients } = v.data;

  try {
    const id = await productsService.createProduct({
      name,
      categoryId,
      price,
      imageUri,
      recipe,
      additionalIngredients,
    });
    if (!id) {
      res.status(422).json({ error: 'Could not create product. Recipe may have no valid items.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[products] createProduct', fallbackMessage: 'Failed to create product.' });
  }
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  const v = validateAddCategory(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { name } = v.data;

  try {
    const id = await productsService.addCategory({ name });
    if (!id) {
      res.status(409).json({ error: 'A category with that name already exists.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    handleControllerError(error, res, { label: '[products] addCategory', fallbackMessage: 'Failed to create category.' });
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, categoryId, price, imageUri, isActive } = req.body;

  try {
    await productsService.updateProduct({ id, name, categoryId, price, imageUri, isActive });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[products] updateProduct', fallbackMessage: 'Failed to update product.' });
  }
}

export async function setProductIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const v = validateSetIngredient(req.body as Record<string, unknown>);
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { ingredientId, quantityUsed } = v.data;

  try {
    await productsService.setProductIngredient({ productId: id, ingredientId, quantityUsed });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[products] setProductIngredient', fallbackMessage: 'Failed to set product ingredient.' });
  }
}

export async function removeProductIngredient(req: Request, res: Response): Promise<void> {
  const { id, ingredientId } = req.params as Record<string, string>;

  try {
    await productsService.removeProductIngredient({ productId: id, ingredientId });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[products] removeProductIngredient', fallbackMessage: 'Failed to remove product ingredient.' });
  }
}

export async function setProductAdditionalIngredient(req: Request, res: Response): Promise<void> {
  const { id, ingredientId } = req.params as Record<string, string>;
  const v = validateSetAdditionalIngredient(
    req.params as Record<string, unknown>,
    req.body as Record<string, unknown>,
  );
  if (!v.valid) {
    res.status(400).json({ error: v.error });
    return;
  }
  const { quantityUsed, additionalPrice } = v.data;

  try {
    await productsService.setProductAdditionalIngredient({
      productId: id,
      ingredientId,
      quantityUsed,
      additionalPrice,
    });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[products] setProductAdditionalIngredient', fallbackMessage: 'Failed to set product additional ingredient.' });
  }
}

export async function removeProductAdditionalIngredient(req: Request, res: Response): Promise<void> {
  const { id, ingredientId } = req.params as Record<string, string>;

  try {
    await productsService.removeProductAdditionalIngredient({ productId: id, ingredientId });
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[products] removeProductAdditionalIngredient', fallbackMessage: 'Failed to remove product additional ingredient.' });
  }
}
