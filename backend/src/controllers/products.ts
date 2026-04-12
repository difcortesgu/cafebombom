import { ProductsSqliteService } from '@/services/products';
import type { ProductRecipeInput } from '@/types/products';
import type { Request, Response } from 'express';

const productsService = new ProductsSqliteService();

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  try {
    const data = await productsService.getHydrationData();
    res.status(200).json(data);
  } catch (error) {
    console.error('[products] getHydrationData failed:', error);
    res.status(500).json({ error: 'Failed to fetch products data.' });
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, categoryId, price, imageUri, recipe } = req.body;

  if (!name || price == null || !Array.isArray(recipe) || recipe.length === 0) {
    res.status(400).json({ error: 'name, price, and recipe (non-empty array) are required.' });
    return;
  }

  const typedRecipe = recipe as [ProductRecipeInput, ...ProductRecipeInput[]];

  try {
    const id = await productsService.createProduct({ name, categoryId, price, imageUri, recipe: typedRecipe });
    if (!id) {
      res.status(422).json({ error: 'Could not create product. Recipe may have no valid items.' });
      return;
    }
    res.status(201).json({ id });
  } catch (error) {
    console.error('[products] createProduct failed:', error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, categoryId, price, imageUri, isActive } = req.body;

  try {
    await productsService.updateProduct({ id, name, categoryId, price, imageUri, isActive });
    res.status(204).send();
  } catch (error) {
    console.error('[products] updateProduct failed:', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
}

export async function setProductIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { ingredientId, quantityUsed } = req.body;

  if (!ingredientId || quantityUsed == null) {
    res.status(400).json({ error: 'ingredientId and quantityUsed are required.' });
    return;
  }

  try {
    await productsService.setProductIngredient({ productId: id, ingredientId, quantityUsed });
    res.status(204).send();
  } catch (error) {
    console.error('[products] setProductIngredient failed:', error);
    res.status(500).json({ error: 'Failed to set product ingredient.' });
  }
}

export async function removeProductIngredient(req: Request, res: Response): Promise<void> {
  const { id, ingredientId } = req.params as Record<string, string>;

  try {
    await productsService.removeProductIngredient({ productId: id, ingredientId });
    res.status(204).send();
  } catch (error) {
    console.error('[products] removeProductIngredient failed:', error);
    res.status(500).json({ error: 'Failed to remove product ingredient.' });
  }
}

export async function setComposition(req: Request, res: Response): Promise<void> {
  const { parentId } = req.params as Record<string, string>;
  const { childIngredientId, quantityNeeded } = req.body;

  if (!childIngredientId || quantityNeeded == null) {
    res.status(400).json({ error: 'childIngredientId and quantityNeeded are required.' });
    return;
  }

  try {
    await productsService.setComposition({ parentIngredientId: parentId, childIngredientId, quantityNeeded });
    res.status(204).send();
  } catch (error) {
    console.error('[products] setComposition failed:', error);
    res.status(500).json({ error: 'Failed to set ingredient composition.' });
  }
}

export async function removeComposition(req: Request, res: Response): Promise<void> {
  const { parentId, childId } = req.params as Record<string, string>;

  try {
    await productsService.removeComposition({ parentIngredientId: parentId, childIngredientId: childId });
    res.status(204).send();
  } catch (error) {
    console.error('[products] removeComposition failed:', error);
    res.status(500).json({ error: 'Failed to remove ingredient composition.' });
  }
}
