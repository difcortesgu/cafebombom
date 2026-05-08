import {
    createProduct,
    getHydrationData,
    removeProductIngredient,
    setProductIngredient,
    updateProduct,
} from '@/controllers/products';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

// All product routes require auth
router.use(authMiddleware);

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get hydration data (categories, products, ingredient links, compositions)
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

export default router;
