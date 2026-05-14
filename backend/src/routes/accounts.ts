import {
    addCashRegisterAdjustment,
    addEmployee,
    addExpense,
    addPayroll,
    closeCashRegister,
    getCashRegisterAdjustments,
    getExpensesTotal,
    getHydrationData,
    getTodayCashRegister,
    getTodayCashRegisterSummary,
    openCashRegister,
} from '@/controllers/accounts';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

// All accounts routes require auth
router.use(authMiddleware);

/**
 * @openapi
 * /api/accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: Get hydration data (expenses, employees, payroll records)
 *     responses:
 *       200:
 *         description: Full accounts hydration payload
 *       403:
 *         description: Forbidden
 */
router.get('/', getHydrationData);

/**
 * @openapi
 * /api/accounts/expenses:
 *   post:
 *     tags: [Accounts]
 *     summary: Record an expense
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, amount, paymentMethodId]
 *             properties:
 *               category: { type: string }
 *               amount: { type: number }
 *               paymentMethodId: { type: string }
 *               description: { type: string, nullable: true }
 *               dateUnix: { type: integer, nullable: true, description: "Unix timestamp; defaults to now" }
 *     responses:
 *       201:
 *         description: Expense recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 */
router.post('/expenses', addExpense);

/**
 * @openapi
 * /api/accounts/expenses/total:
 *   get:
 *     tags: [Accounts]
 *     summary: Get total expenses for a time period
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: integer }
 *         description: Start of period as Unix timestamp
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: integer }
 *         description: End of period as Unix timestamp
 *     responses:
 *       200:
 *         description: Total expenses amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: number }
 */
router.get('/expenses/total', getExpensesTotal);

/**
 * @openapi
 * /api/accounts/employees:
 *   post:
 *     tags: [Accounts]
 *     summary: Add an employee (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 */
router.post('/employees', requireRole('owner'), addEmployee);

/**
 * @openapi
 * /api/accounts/payroll:
 *   post:
 *     tags: [Accounts]
 *     summary: Record a payroll disbursement for an employee
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, periodStart, periodEnd, amount, paymentMethodId]
 *             properties:
 *               employeeId: { type: string }
 *               periodStart: { type: integer, description: "Unix timestamp" }
 *               periodEnd: { type: integer, description: "Unix timestamp" }
 *               amount: { type: number }
 *               paymentMethodId: { type: string }
 *     responses:
 *       201:
 *         description: Payroll recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 */
router.post('/payroll', addPayroll);

/**
 * @openapi
 * /api/accounts/cash-register/today:
 *   get:
 *     tags: [Accounts]
 *     summary: Get today's cash register session
 *     responses:
 *       200:
 *         description: Today's cash register session or null
 */
router.get('/cash-register/today', getTodayCashRegister);

/**
 * @openapi
 * /api/accounts/cash-register/summary/today:
 *   get:
 *     tags: [Accounts]
 *     summary: Get today's income and expenses grouped by payment method
 *     responses:
 *       200:
 *         description: Daily cash register summary
 */
router.get('/cash-register/summary/today', getTodayCashRegisterSummary);

/**
 * @openapi
 * /api/accounts/cash-register/open:
 *   post:
 *     tags: [Accounts]
 *     summary: Open the cash register for today
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [openingAmount]
 *             properties:
 *               openingAmount: { type: number }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Cash register session opened
 *       409:
 *         description: A session is already open for today
 */
router.post('/cash-register/open', openCashRegister);

/**
 * @openapi
 * /api/accounts/cash-register/close:
 *   post:
 *     tags: [Accounts]
 *     summary: Close the cash register session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, closingAmount]
 *             properties:
 *               sessionId: { type: string }
 *               closingAmount: { type: number }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Cash register session closed
 *       409:
 *         description: Session not found or already closed
 */
router.post('/cash-register/close', closeCashRegister);

/**
 * @openapi
 * /api/accounts/cash-register/adjustments:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a cash register adjustment (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, amount, reason]
 *             properties:
 *               sessionId: { type: string }
 *               amount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Adjustment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 */
router.post('/cash-register/adjustments', requireRole('owner'), addCashRegisterAdjustment);

/**
 * @openapi
 * /api/accounts/cash-register/{sessionId}/adjustments:
 *   get:
 *     tags: [Accounts]
 *     summary: List adjustments for a cash register session (owner only)
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of adjustments
 *       403:
 *         description: Forbidden
 */
router.get('/cash-register/:sessionId/adjustments', getCashRegisterAdjustments);

export default router;
