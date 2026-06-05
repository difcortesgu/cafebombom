import fs from 'fs';
import path from 'path';
import { productImageService, productsService } from '../services';
import { logger } from '../utils/logger';
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
  const { name, categoryId, price, imageUri, isCombo, recipe, additionalIngredients } = v.data;

  try {
    const id = await productsService.createProduct({
      name,
      categoryId,
      price,
      imageUri,
      isCombo,
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
  } catch (error) {
    handleControllerError(error, res, { label: '[products] uploadProductImage', fallbackMessage: 'Failed to process product image upload.' });
  } finally {
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

export async function setComboGroup(req: Request, res: Response): Promise<void> {
  const { id, groupId } = req.params as Record<string, string>;
  const { name, minQuantity, maxQuantity } = req.body as Record<string, unknown>;

  if (!name || typeof minQuantity !== 'number' || typeof maxQuantity !== 'number') {
    res.status(400).json({ error: 'Invalid combo group data.' });
    return;
  }

  try {
    const newGroupId = await productsService.setComboGroup({
      comboProductId: id,
      name: String(name),
      minQuantity: Number(minQuantity),
      maxQuantity: Number(maxQuantity),
      groupId,
    });
    res.status(groupId ? 204 : 201).json(groupId ? undefined : { id: newGroupId });
  } catch (error) {
    handleControllerError(error, res, { label: '[products] setComboGroup', fallbackMessage: 'Failed to set combo group.' });
  }
}

export async function removeComboGroup(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params as Record<string, string>;

  try {
    await productsService.removeComboGroup(groupId);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[products] removeComboGroup', fallbackMessage: 'Failed to remove combo group.' });
  }
}

export async function setComboGroupOption(req: Request, res: Response): Promise<void> {
  const { groupId, optionId } = req.params as Record<string, string>;
  const { productId, additionalPrice, isDefault } = req.body as Record<string, unknown>;

  if (!productId || typeof additionalPrice !== 'number' || typeof isDefault !== 'boolean') {
    res.status(400).json({ error: 'Invalid combo option data.' });
    return;
  }

  try {
    const newOptionId = await productsService.setComboGroupOption({
      groupId,
      productId: String(productId),
      additionalPrice: Number(additionalPrice),
      isDefault: Boolean(isDefault),
      optionId,
    });
    res.status(optionId ? 204 : 201).json(optionId ? undefined : { id: newOptionId });
  } catch (error) {
    handleControllerError(error, res, { label: '[products] setComboGroupOption', fallbackMessage: 'Failed to set combo option.' });
  }
}

export async function removeComboGroupOption(req: Request, res: Response): Promise<void> {
  const { optionId } = req.params as Record<string, string>;

  try {
    await productsService.removeComboGroupOption(optionId);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, { label: '[products] removeComboGroupOption', fallbackMessage: 'Failed to remove combo option.' });
  }
}
