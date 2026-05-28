import {
    createUser,
    deactivateUser,
    getActiveUsers,
    getAllUsers,
    hardDeleteUser,
    reactivateUser,
    updateOwnProfile,
} from '../controllers/users';
import { authMiddleware, requireRole } from '../middleware/auth';
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /api/users/active:
 *   get:
 *     tags: [Users]
 *     summary: List active users (login screen)
 *     responses:
 *       200:
 *         description: Array of active users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized
 */
router.get('/active', getActiveUsers);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users including inactive (owner only)
 *     responses:
 *       200:
 *         description: Array of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ManagedUser' }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — owner role required
 *   post:
 *     tags: [Users]
 *     summary: Create a new user (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, role, pin]
 *             properties:
 *               name: { type: string }
 *               role: { type: string, enum: [owner, staff] }
 *               pin: { type: string, minLength: 4 }
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Missing or invalid fields
 *       403:
 *         description: Forbidden
 *       409:
 *         description: User already exists
 */
router.get('/', authMiddleware, requireRole('owner'), getAllUsers);
router.post('/', authMiddleware, requireRole('owner'), createUser);

/**
 * @openapi
 * /api/users/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Update own name or PIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               pin: { type: string, minLength: 4 }
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.patch('/profile', authMiddleware, updateOwnProfile);

/**
 * @openapi
 * /api/users/{id}/deactivate:
 *   post:
 *     tags: [Users]
 *     summary: Deactivate a user account (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deactivated
 *       403:
 *         description: Forbidden
 *       422:
 *         description: Cannot deactivate self or last owner
 */
router.post('/:id/deactivate', authMiddleware, requireRole('owner'), deactivateUser);

/**
 * @openapi
 * /api/users/{id}/reactivate:
 *   post:
 *     tags: [Users]
 *     summary: Reactivate a deactivated user (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Reactivated
 *       403:
 *         description: Forbidden
 *       422:
 *         description: Already active or not found
 */
router.post('/:id/reactivate', authMiddleware, requireRole('owner'), reactivateUser);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Permanently delete a user (owner only). Blocked if user has linked sales.
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
 *         description: Linked sales history or last owner protection
 */
router.delete('/:id', authMiddleware, requireRole('owner'), hardDeleteUser);

export default router;
