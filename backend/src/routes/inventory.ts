import { Router } from 'express';
import {
    addIngredient,
    addRestock,
    addSupplier,
    getHydrationData,
    updateIngredient,
} from '../controllers/inventory';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All inventory routes require auth
router.use(authMiddleware);

/**
 * @openapi
 * /api/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get hydration data (ingredients, suppliers, restocks)
 *     responses:
 *       200:
 *         description: Full inventory hydration payload
 */
router.get('/', getHydrationData);

/**
 * @openapi
 * /api/inventory/ingredients:
 *   post:
 *     tags: [Inventory]
 *     summary: Add a new ingredient (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unit, quantity]
 *             properties:
 *               name: { type: string }
 *               unit: { type: string }
 *               quantity: { type: number }
 *               lowStockThreshold: { type: number, nullable: true }
 *               supplierId: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Ingredient created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 */
router.post('/ingredients', requireRole('owner'), addIngredient);

/**
 * @openapi
 * /api/inventory/ingredients/{id}:
 *   put:
 *     tags: [Inventory]
 *     summary: Update an ingredient (owner only)
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
 *               unit: { type: string }
 *               quantity: { type: number }
 *               lowStockThreshold: { type: number, nullable: true }
 *               supplierId: { type: string, nullable: true }
 *     responses:
 *       204:
 *         description: Updated
 *       403:
 *         description: Forbidden
 */
router.put('/ingredients/:id', requireRole('owner'), updateIngredient);

/**
 * @openapi
 * /api/inventory/suppliers:
 *   post:
 *     tags: [Inventory]
 *     summary: Add a new supplier (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, nullable: true }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Supplier created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 */
router.post('/suppliers', requireRole('owner'), addSupplier);

/**
 * @openapi
 * /api/inventory/restocks:
 *   post:
 *     tags: [Inventory]
 *     summary: Record an ingredient restock event (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ingredientId, quantityAdded, cost]
 *             properties:
 *               ingredientId: { type: string }
 *               quantityAdded: { type: number }
 *               cost: { type: number }
 *               supplierId: { type: string, nullable: true }
 *               dateUnix: { type: integer, nullable: true, description: "Unix timestamp; defaults to now" }
 *     responses:
 *       201:
 *         description: Restock recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 */
router.post('/restocks', requireRole('owner'), addRestock);

export default router;
