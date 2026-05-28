import {
    addItemToOrder,
    cancelOrder,
    createDiscount,
    createPartialPayment,
    createSale,
    createTable,
    deleteDiscount,
    deleteTable,
    getDashboardSummary,
    getDiscounts,
    getHydrationData,
    getRevenueInRange,
    getSaleItems,
    getSalePaymentBoard,
    getSalePayments,
    getSalePricingSummary,
    getSurchargeConfig,
    getTables,
    getTopSelling,
    markOrderPaid,
    markOrderReady,
    removeItemFromOrder,
    saveSurchargeConfig,
    sendToKitchen,
    updateDiscount,
    updateDraftOrder,
    updateTable,
} from '../controllers/sales';
import { authMiddleware, requireRole } from '../middleware/auth';
import { Router } from 'express';

const router = Router();

// All sales routes require auth
router.use(authMiddleware);

/**
 * @openapi
 * /api/sales:
 *   get:
 *     tags: [Sales]
 *     summary: Get hydration data (products, recent sales, tables, discounts)
 *     responses:
 *       200:
 *         description: Hydration payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 sales:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Sale' }
 *                 tables:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/RestaurantTable' }
 *                 discounts:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Discount' }
 *   post:
 *     tags: [Sales]
 *     summary: Create a new sale order (draft)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [staffId, items, tableId]
 *             properties:
 *               staffId: { type: string }
 *               tableId: { type: string }
 *               globalDiscountId: { type: string, nullable: true }
 *               orderTypeSurcharge: { type: number }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer }
 *                     unitPrice:
 *                       type: number
 *                       description: Optional client estimate. Final price is recalculated by backend using base price plus selected additional ingredients.
 *                     removedIngredientIds:
 *                       type: array
 *                       items: { type: string }
 *                     additionalIngredients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [ingredientId, quantity]
 *                         properties:
 *                           ingredientId: { type: string }
 *                           quantity: { type: integer, minimum: 1 }
 *     responses:
 *       201:
 *         description: Sale created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       400:
 *         description: Missing required fields
 */
router.get('/', getHydrationData);
router.post('/', createSale);

/**
 * @openapi
 * /api/sales/{id}:
 *   put:
 *     tags: [Sales]
 *     summary: Replace items on a draft order
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
 *             required: [staffId, items, tableId]
 *             properties:
 *               staffId: { type: string }
 *               tableId: { type: string }
 *               globalDiscountId: { type: string, nullable: true }
 *               orderTypeSurcharge: { type: number }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer }
 *                     unitPrice:
 *                       type: number
 *                       description: Optional client estimate. Final price is recalculated by backend using base price plus selected additional ingredients.
 *                     removedIngredientIds:
 *                       type: array
 *                       items: { type: string }
 *                     additionalIngredients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [ingredientId, quantity]
 *                         properties:
 *                           ingredientId: { type: string }
 *                           quantity: { type: integer, minimum: 1 }
 *     responses:
 *       204:
 *         description: Updated
 *       422:
 *         description: Order not found or not a draft
 */
router.put('/:id', updateDraftOrder);

/**
 * @openapi
 * /api/sales/{id}/items:
 *   get:
 *     tags: [Sales]
 *     summary: Get line items for a sale
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of sale item details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       product_id: { type: string }
 *                       product_name: { type: string }
 *                       quantity: { type: integer }
 *                       removed_ingredient_ids:
 *                         type: array
 *                         items: { type: string }
 *                       selected_additional_ingredients:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             ingredientId: { type: string }
 *                             quantity: { type: integer }
 *                       selected_additional_ingredient_details:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             ingredient_id: { type: string }
 *                             ingredient_name: { type: string }
 *                             quantity: { type: integer }
 *                             unit_additional_price: { type: number }
 *                             total_additional_price: { type: number }
 *                       unit_price: { type: number }
 *                       line_subtotal: { type: number }
 *                       final_line_total: { type: number }
 *   post:
 *     tags: [Sales]
 *     summary: Add an item to a draft order
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
 *             required: [item]
 *             properties:
 *               item:
 *                 type: object
 *                 required: [productId, quantity]
 *                 properties:
 *                   productId: { type: string }
 *                   quantity: { type: integer }
 *                   unitPrice:
 *                     type: number
 *                     description: Optional client estimate. Final price is recalculated by backend using base price plus selected additional ingredients.
 *                   removedIngredientIds:
 *                     type: array
 *                     items: { type: string }
 *                   additionalIngredients:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required: [ingredientId, quantity]
 *                       properties:
 *                         ingredientId: { type: string }
 *                         quantity: { type: integer, minimum: 1 }
 *     responses:
 *       201:
 *         description: Item added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       422:
 *         description: Order not found or not a draft
 */
router.get('/:id/items', getSaleItems);
router.post('/:id/items', addItemToOrder);

/**
 * @openapi
 * /api/sales/{id}/items/{itemId}:
 *   delete:
 *     tags: [Sales]
 *     summary: Remove an item from a draft order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Item removed
 *       422:
 *         description: Order not found, not a draft, or last item
 */
router.delete('/:id/items/:itemId', removeItemFromOrder);

/**
 * @openapi
 * /api/sales/{id}/pricing:
 *   get:
 *     tags: [Sales]
 *     summary: Get pricing summary for a sale
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pricing summary with subtotals, discounts, surcharges, and total
 *       404:
 *         description: Sale not found
 */
router.get('/:id/pricing', getSalePricingSummary);

/**
 * @openapi
 * /api/sales/{id}/send-to-kitchen:
 *   post:
 *     tags: [Sales]
 *     summary: Move order from draft to in-progress and deduct inventory
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Order sent to kitchen
 *       422:
 *         description: Order not a draft
 */
router.post('/:id/send-to-kitchen', sendToKitchen);

/**
 * @openapi
 * /api/sales/{id}/mark-ready:
 *   post:
 *     tags: [Sales]
 *     summary: Mark an in-progress order as ready for pickup
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Marked ready
 *       422:
 *         description: Invalid status transition
 */
router.post('/:id/mark-ready', markOrderReady);

/**
 * @openapi
 * /api/sales/{id}/mark-paid:
 *   post:
 *     tags: [Sales]
 *     summary: Mark an order as paid (completes it)
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
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod: { type: string, enum: [cash, card, transfer] }
 *     responses:
 *       204:
 *         description: Marked paid
 *       400:
 *         description: Invalid payment method
 *       422:
 *         description: Invalid status transition
 */
router.post('/:id/mark-paid', markOrderPaid);
router.get('/:id/payment-board', getSalePaymentBoard);
router.get('/:id/payments', getSalePayments);
router.post('/:id/partial-pay', createPartialPayment);

/**
 * @openapi
 * /api/sales/{id}/cancel:
 *   post:
 *     tags: [Sales]
 *     summary: Cancel an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Cancelled
 *       422:
 *         description: Invalid status transition
 */
router.post('/:id/cancel', cancelOrder);

/**
 * @openapi
 * /api/sales/discounts:
 *   get:
 *     tags: [Sales - Discounts]
 *     summary: List all discounts
 *     responses:
 *       200:
 *         description: Array of discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Discount' }
 *   post:
 *     tags: [Sales - Discounts]
 *     summary: Create a discount (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Discount' }
 *     responses:
 *       201:
 *         description: Discount created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 */
router.get('/discounts', getDiscounts);
router.post('/discounts', requireRole('owner'), createDiscount);

/**
 * @openapi
 * /api/sales/discounts/{id}:
 *   put:
 *     tags: [Sales - Discounts]
 *     summary: Update a discount (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Discount' }
 *     responses:
 *       204:
 *         description: Updated
 *       403:
 *         description: Forbidden
 *   delete:
 *     tags: [Sales - Discounts]
 *     summary: Delete a discount (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 */
router.put('/discounts/:id', requireRole('owner'), updateDiscount);
router.delete('/discounts/:id', requireRole('owner'), deleteDiscount);

/**
 * @openapi
 * /api/sales/tables:
 *   get:
 *     tags: [Sales - Tables]
 *     summary: List all tables
 *     responses:
 *       200:
 *         description: Array of tables
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/RestaurantTable' }
 *   post:
 *     tags: [Sales - Tables]
 *     summary: Create a table (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tableType]
 *             properties:
 *               name: { type: string }
 *               tableType: { type: string, enum: [dine-in, to-go, delivery] }
 *     responses:
 *       201:
 *         description: Table created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Name already exists
 */
router.get('/tables', getTables);
router.post('/tables', requireRole('owner'), createTable);

/**
 * @openapi
 * /api/sales/tables/{id}:
 *   put:
 *     tags: [Sales - Tables]
 *     summary: Update a table (owner only)
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
 *             required: [name, tableType]
 *             properties:
 *               name: { type: string }
 *               tableType: { type: string, enum: [dine-in, to-go, delivery] }
 *     responses:
 *       204:
 *         description: Updated
 *       403:
 *         description: Forbidden
 *   delete:
 *     tags: [Sales - Tables]
 *     summary: Delete a table (owner only). Blocked if table has linked sales.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 *       422:
 *         description: Table has linked sales
 */
router.put('/tables/:id', requireRole('owner'), updateTable);
router.delete('/tables/:id', requireRole('owner'), deleteTable);

/**
 * @openapi
 * /api/sales/config/surcharges:
 *   get:
 *     tags: [Sales - Config]
 *     summary: Get order-type surcharge configuration
 *     responses:
 *       200:
 *         description: Surcharge config
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 toGoSurcharge: { type: number }
 *                 deliverySurcharge: { type: number }
 *   put:
 *     tags: [Sales - Config]
 *     summary: Save order-type surcharge configuration (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toGoSurcharge, deliverySurcharge]
 *             properties:
 *               toGoSurcharge: { type: number }
 *               deliverySurcharge: { type: number }
 *     responses:
 *       204:
 *         description: Saved
 *       403:
 *         description: Forbidden
 */
router.get('/config/surcharges', getSurchargeConfig);
router.put('/config/surcharges', requireRole('owner'), saveSurchargeConfig);

// Backward-compatible alias used by older frontend builds.
router.get('/surcharge-config', getSurchargeConfig);
router.put('/surcharge-config', requireRole('owner'), saveSurchargeConfig);

/**
 * @openapi
 * /api/sales/analytics/dashboard:
 *   get:
 *     tags: [Sales - Analytics]
 *     summary: Get dashboard summary for a time range (owner only)
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: integer }
 *         description: Unix timestamp start
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: integer }
 *         description: Unix timestamp end
 *       - in: query
 *         name: bucket
 *         schema: { type: string, enum: [hour, day] }
 *         description: Trend grouping bucket (default day)
 *     responses:
 *       200:
 *         description: Dashboard summary with revenue, counts, top products, trend
 *       400:
 *         description: Invalid query params
 *       403:
 *         description: Forbidden
 */
router.get('/analytics/dashboard', requireRole('owner'), getDashboardSummary);

/**
 * @openapi
 * /api/sales/analytics/revenue:
 *   get:
 *     tags: [Sales - Analytics]
 *     summary: Get total realized revenue in a time range (owner only)
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Revenue total
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 revenue: { type: number }
 *       400:
 *         description: Invalid query params
 *       403:
 *         description: Forbidden
 */
router.get('/analytics/revenue', requireRole('owner'), getRevenueInRange);

/**
 * @openapi
 * /api/sales/analytics/top-selling:
 *   get:
 *     tags: [Sales - Analytics]
 *     summary: Get top-selling products by quantity (owner only)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5, maximum: 20 }
 *     responses:
 *       200:
 *         description: Top-selling product list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   quantity: { type: integer }
 *       403:
 *         description: Forbidden
 */
router.get('/analytics/top-selling', requireRole('owner'), getTopSelling);

export default router;
