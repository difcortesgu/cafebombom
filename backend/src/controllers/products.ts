import fs from 'fs';
import path from 'path';
import { productImageService, productsService } from '../services';
import { logger } from '../utils/logger';
import {
  addCategorySchema,
  comboGroupOptionSchema,
  comboGroupSchema,
  createProductSchema,
  setAdditionalIngredientSchema,
  setIngredientSchema,
} from '../validators/products';
import type { ProductRecipeInput } from '../types/products';
import type { Request, Response } from 'express';

// Unexpected errors thrown here propagate to the central error handler
// (see utils/errors.ts), which logs them and responds with a 500.

export async function getHydrationData(req: Request, res: Response): Promise<void> {
  const data = await productsService.getHydrationData();
  res.status(200).json(data);
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, categoryId, price, imageUri, isCombo, recipe, additionalIngredients } =
    createProductSchema.parse(req.body);

  const id = await productsService.createProduct({
    name,
    categoryId,
    price,
    imageUri,
    isCombo,
    recipe: recipe as [ProductRecipeInput, ...ProductRecipeInput[]] | undefined,
    additionalIngredients,
  });
  if (!id) {
    res.status(422).json({ error: 'Could not create product. Recipe may have no valid items.' });
    return;
  }
  res.status(201).json({ id });
}

export async function uploadProductImage(req: Request, res: Response): Promise<void> {
  const upload = req as Request & { file?: { path?: string; originalname?: string; mimetype?: string } };
  const filePath = upload.file?.path;

  if (!filePath) {
    res.status(400).json({ error: 'Product image file is required.' });
    return;
  }

  try {
    const { imageId, version } = await productImageService.saveUploadedImage({
      tempFilePath: filePath,
      originalFileName: upload.file?.originalname ?? 'image.jpg',
      mimeType: upload.file?.mimetype ?? 'image/jpeg',
    });

    const imageUrl = `${req.protocol}://${req.get('host')}/api/products/images/${imageId}?v=${version}`;
    res.status(201).json({ imageId, version, imageUrl });
  } finally {
    // Always clean up the multer temp file, even when the upload fails and the
    // error propagates to the central handler.
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // ignore temp cleanup failures
    }
  }
}

export function getProductImage(req: Request, res: Response): void {
  const { id } = req.params as Record<string, string>;

  // Guard against path traversal: stored ids are UUIDs.
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    res.status(400).json({ error: 'Invalid image id.' });
    return;
  }

  const imagePath = productImageService.getImagePath(id);
  if (!fs.existsSync(imagePath)) {
    res.status(404).json({ error: 'Product image not found.' });
    return;
  }

  const version = typeof req.query.v === 'string' ? req.query.v : null;
  if (version) {
    res.setHeader('ETag', `"${version}"`);
  }
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendFile(path.resolve(imagePath), { dotfiles: 'allow' }, (error) => {
    if (error) {
      logger.error('[products] getProductImage failed:', error);
      if (!res.headersSent) {
        res.status(500).end();
      }
    }
  });
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  const { name } = addCategorySchema.parse(req.body);

  const id = await productsService.addCategory({ name });
  if (!id) {
    res.status(409).json({ error: 'A category with that name already exists.' });
    return;
  }
  res.status(201).json({ id });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, categoryId, price, imageUri, isActive } = req.body;

  await productsService.updateProduct({ id, name, categoryId, price, imageUri, isActive });
  res.status(204).send();
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const result = await productsService.deleteProduct(id);
  if (result === 'not-found') {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.status(200).json({ ok: true, mode: result });
}

export async function setProductIngredient(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { ingredientId, quantityUsed } = setIngredientSchema.parse(req.body);

  await productsService.setProductIngredient({ productId: id, ingredientId, quantityUsed });
  res.status(204).send();
}

export async function removeProductIngredient(req: Request, res: Response): Promise<void> {
  const { id, ingredientId } = req.params as Record<string, string>;

  await productsService.removeProductIngredient({ productId: id, ingredientId });
  res.status(204).send();
}

export async function setProductAdditionalIngredient(req: Request, res: Response): Promise<void> {
  const { id, ingredientId } = req.params as Record<string, string>;
  const { quantityUsed, additionalPrice } = setAdditionalIngredientSchema.parse(req.body);

  await productsService.setProductAdditionalIngredient({
    productId: id,
    ingredientId,
    quantityUsed,
    additionalPrice,
  });
  res.status(204).send();
}

export async function removeProductAdditionalIngredient(req: Request, res: Response): Promise<void> {
  const { id, ingredientId } = req.params as Record<string, string>;

  await productsService.removeProductAdditionalIngredient({ productId: id, ingredientId });
  res.status(204).send();
}

export async function setComboGroup(req: Request, res: Response): Promise<void> {
  const { id, groupId } = req.params as Record<string, string>;
  const { name, minQuantity, maxQuantity } = comboGroupSchema.parse(req.body);

  const newGroupId = await productsService.setComboGroup({
    comboProductId: id,
    name,
    minQuantity,
    maxQuantity,
    groupId,
  });
  res.status(groupId ? 204 : 201).json(groupId ? undefined : { id: newGroupId });
}

export async function removeComboGroup(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params as Record<string, string>;

  await productsService.removeComboGroup(groupId);
  res.status(204).send();
}

export async function setComboGroupOption(req: Request, res: Response): Promise<void> {
  const { groupId, optionId } = req.params as Record<string, string>;
  const { productId, additionalPrice, isDefault } = comboGroupOptionSchema.parse(req.body);

  const newOptionId = await productsService.setComboGroupOption({
    groupId,
    productId,
    additionalPrice,
    isDefault,
    optionId,
  });
  res.status(optionId ? 204 : 201).json(optionId ? undefined : { id: newOptionId });
}

export async function removeComboGroupOption(req: Request, res: Response): Promise<void> {
  const { optionId } = req.params as Record<string, string>;

  await productsService.removeComboGroupOption(optionId);
  res.status(204).send();
}
