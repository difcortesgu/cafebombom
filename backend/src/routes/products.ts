import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import {
    addCategory,
    createProduct,
    deleteProduct,
    getHydrationData,
    getProductImage,
    removeComboGroup,
    removeComboGroupOption,
    removeProductAdditionalIngredient,
    removeProductIngredient,
    setComboGroup,
    setComboGroupOption,
    setProductAdditionalIngredient,
    setProductIngredient,
    updateProduct,
    uploadProductImage,
} from '../controllers/products';
import { ensureProductImagesDir } from '../database';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const productImagesRoot = ensureProductImagesDir();
const productImagesTmpDir = path.join(productImagesRoot, '.tmp');
if (!fs.existsSync(productImagesTmpDir)) {
    fs.mkdirSync(productImagesTmpDir, { recursive: true });
}

const imageUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, productImagesTmpDir);
        },
        filename: (_req, file, cb) => {
            const timestamp = Date.now();
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            cb(null, `${timestamp}-${sanitizedName}`);
        },
    }),
    limits: {
        fileSize: 8 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const acceptedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
        const lowerName = file.originalname.toLowerCase();
        const validExtension = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp');

        if (validExtension || acceptedMimeTypes.has(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    },
});

function imageUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
    imageUpload.single('file')(req, res, (error: unknown) => {
        if (!error) {
            next();
            return;
        }

        logger.error('Product image upload error:', error);
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({ error: 'Image file exceeds maximum size of 8MB.', code: error.code });
                return;
            }

            res.status(400).json({ error: 'Invalid image file upload.', code: error.code });
            return;
        }

        res.status(400).json({ error: 'Invalid image file upload.', code: 'UPLOAD_FAILED' });
    });
}

/**
 * @openapi
 * /api/products/images/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Serve a stored product image (public so <Image> can load it without auth headers)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: JPEG image
 *       404:
 *         description: Not found
 */
router.get('/images/:id', getProductImage);

// All other product routes require auth
router.use(authMiddleware);

/**
 * @openapi
 * /api/products/images:
 *   post:
 *     tags: [Products]
 *     summary: Upload a product image (owner only); returns a stable server URL
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Stored image reference
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageId: { type: string }
 *                 version: { type: string }
 *                 imageUrl: { type: string }
 */
router.post('/images', requireRole('owner'), imageUploadMiddleware, uploadProductImage);

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get hydration data (categories, products, recipe links, additional ingredient links)
 *     responses:
 *       200:
 *         description: Full products hydration payload
 *   post:
 *     tags: [Products]
 *     summary: Create a product with its ingredient recipe (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, recipe]
 *             properties:
 *               name: { type: string }
 *               categoryId: { type: string, nullable: true }
 *               price: { type: number }
 *               imageUri: { type: string, nullable: true }
 *               recipe:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [ingredientId, quantityUsed]
 *                   properties:
 *                     ingredientId: { type: string }
 *                     quantityUsed: { type: number }
 *               additionalIngredients:
 *                 type: array
 *                 description: Optional ingredient options that can be sold as extras for this product.
 *                 items:
 *                   type: object
 *                   required: [ingredientId, quantityUsed, additionalPrice]
 *                   properties:
 *                     ingredientId: { type: string }
 *                     quantityUsed: { type: number }
 *                     additionalPrice: { type: number }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 *       422:
 *         description: Recipe is empty or invalid
 */
router.get('/', getHydrationData);
router.post('/', requireRole('owner'), createProduct);
router.post('/categories', requireRole('owner'), addCategory);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product's metadata (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               categoryId: { type: string, nullable: true }
 *               price: { type: number }
 *               imageUri: { type: string, nullable: true }
 *               isActive: { type: boolean }
 *     responses:
 *       204:
 *         description: Updated
 *       403:
 *         description: Forbidden
 */
router.put('/:id', requireRole('owner'), updateProduct);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (owner only). Soft-deletes if it has sales history or is used in a combo; otherwise hard-deletes.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted (body indicates 'soft' or 'hard')
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete('/:id', requireRole('owner'), deleteProduct);

/**
 * @openapi
 * /api/products/{id}/ingredients/{ingredientId}:
 *   put:
 *     tags: [Products]
 *     summary: Add or update an ingredient link on a product (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: ingredientId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityUsed]
 *             properties:
 *               quantityUsed: { type: number }
 *     responses:
 *       204:
 *         description: Set
 *       403:
 *         description: Forbidden
 *   delete:
 *     tags: [Products]
 *     summary: Remove an ingredient link from a product (owner only). Blocked if last ingredient.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: ingredientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Removed
 *       403:
 *         description: Forbidden
 */
router.put('/:id/ingredients/:ingredientId', requireRole('owner'), setProductIngredient);
router.delete('/:id/ingredients/:ingredientId', requireRole('owner'), removeProductIngredient);

/**
 * @openapi
 * /api/products/{id}/additional-ingredients/{ingredientId}:
 *   put:
 *     tags: [Products]
 *     summary: Add or update an additional ingredient option for a product (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: ingredientId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityUsed, additionalPrice]
 *             properties:
 *               quantityUsed: { type: number }
 *               additionalPrice: { type: number }
 *     responses:
 *       204:
 *         description: Set
 *       403:
 *         description: Forbidden
 *   delete:
 *     tags: [Products]
 *     summary: Remove an additional ingredient option from a product (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: ingredientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Removed
 *       403:
 *         description: Forbidden
 */
router.put('/:id/additional-ingredients/:ingredientId', requireRole('owner'), setProductAdditionalIngredient);
router.delete('/:id/additional-ingredients/:ingredientId', requireRole('owner'), removeProductAdditionalIngredient);

/**
 * @openapi
 * /api/products/{id}/combo-groups:
 *   post:
 *     tags: [Products]
 *     summary: Create a combo group for a combo product (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, minQuantity, maxQuantity]
 *             properties:
 *               name: { type: string }
 *               minQuantity: { type: number }
 *               maxQuantity: { type: number }
 *     responses:
 *       201:
 *         description: Group created
 *       403:
 *         description: Forbidden
 *   put:
 *     tags: [Products]
 *     summary: Update a combo group (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [groupId, name, minQuantity, maxQuantity]
 *             properties:
 *               groupId: { type: string }
 *               name: { type: string }
 *               minQuantity: { type: number }
 *               maxQuantity: { type: number }
 *     responses:
 *       204:
 *         description: Updated
 *       403:
 *         description: Forbidden
 */
router.post('/:id/combo-groups', requireRole('owner'), setComboGroup);
router.put('/:id/combo-groups/:groupId', requireRole('owner'), setComboGroup);

/**
 * @openapi
 * /api/products/{id}/combo-groups/{groupId}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a combo group (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 */
router.delete('/:id/combo-groups/:groupId', requireRole('owner'), removeComboGroup);

/**
 * @openapi
 * /api/products/{id}/combo-groups/{groupId}/options:
 *   post:
 *     tags: [Products]
 *     summary: Add an option to a combo group (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, additionalPrice, isDefault]
 *             properties:
 *               productId: { type: string }
 *               additionalPrice: { type: number }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Option created
 *       403:
 *         description: Forbidden
 *   put:
 *     tags: [Products]
 *     summary: Update a combo group option (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [optionId, productId, additionalPrice, isDefault]
 *             properties:
 *               optionId: { type: string }
 *               productId: { type: string }
 *               additionalPrice: { type: number }
 *               isDefault: { type: boolean }
 *     responses:
 *       204:
 *         description: Updated
 *       403:
 *         description: Forbidden
 */
router.post('/:id/combo-groups/:groupId/options', requireRole('owner'), setComboGroupOption);
router.put('/:id/combo-groups/:groupId/options/:optionId', requireRole('owner'), setComboGroupOption);

/**
 * @openapi
 * /api/products/{id}/combo-groups/{groupId}/options/{optionId}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a combo group option (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 */
router.delete('/:id/combo-groups/:groupId/options/:optionId', requireRole('owner'), removeComboGroupOption);

export default router;
