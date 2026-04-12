import { Router } from 'express';
import {
    addEmployee,
    addExpense,
    addPayroll,
    getExpensesTotal,
    getHydrationData,
} from '../controllers/accounts';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All accounts routes require auth + owner role
router.use(authMiddleware, requireRole('owner'));

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
 *             required: [category, amount]
 *             properties:
 *               category: { type: string }
 *               amount: { type: number }
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
 *       403:
 *         description: Forbidden
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
 *       403:
 *         description: Forbidden
 */
router.get('/expenses/total', getExpensesTotal);

/**
 * @openapi
 * /api/accounts/employees:
 *   post:
 *     tags: [Accounts]
 *     summary: Add an employee
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
router.post('/employees', addEmployee);

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
 *             required: [employeeId, periodStart, periodEnd, amount]
 *             properties:
 *               employeeId: { type: string }
 *               periodStart: { type: integer, description: "Unix timestamp" }
 *               periodEnd: { type: integer, description: "Unix timestamp" }
 *               amount: { type: number }
 *     responses:
 *       201:
 *         description: Payroll recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       403:
 *         description: Forbidden
 */
router.post('/payroll', addPayroll);

export default router;
