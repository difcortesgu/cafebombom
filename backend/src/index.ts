// dotenv MUST be loaded with require() before any other import, so env vars
// are set before module-level code in jwt.ts and other services fires.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

import cors from 'cors';
import express, { Request, Response } from 'express';
import path from 'path';
import { authMiddleware } from './middleware/auth';
import { swaggerDocs, swaggerUi } from './middleware/swagger';
import accountsRouter from './routes/accounts';
import inventoryRouter from './routes/inventory';
import paymentMethodsRouter from './routes/payment-methods';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import setupRouter from './routes/setup';
import usersRouter from './routes/users';
import { AuthSqliteService } from './services/auth';
import { getJwtExpiresIn, signAccessToken } from './services/jwt';

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '10mb';
const authService = new AuthSqliteService();

// Middleware
app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN } : undefined));
app.use(express.json({ limit: JSON_BODY_LIMIT }));

/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to the API
 *     responses:
 *       200:
 *         description: Returns a greeting
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate a user and get a JWT token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, pin]
 *             properties:
 *               userId:
 *                 type: string
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 tokenType: { type: string }
 *                 expiresIn: { type: string }
 *                 sessionId: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Missing userId or pin
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { userId, pin } = req.body as { userId?: string; pin?: string };

    if (!userId || !pin) {
        res.status(400).json({ error: 'userId and pin are required.' });
        return;
    }

    try {
        const user = await authService.authenticate({ userId, pin });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials.' });
            return;
        }

        const sessionId = await authService.startSession(user.id);
        const token = signAccessToken({
            sub: user.id,
            role: user.role,
            name: user.name,
            sid: sessionId,
        });

        res.status(200).json({
            token,
            tokenType: 'Bearer',
            expiresIn: getJwtExpiresIn(),
            user,
            sessionId,
        });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ error: 'Failed to login user.' });
    }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *                 sessionId: { type: string }
 *       401:
 *         description: Unauthorized
 */
app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
    if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
    }

    res.status(200).json({
        user: {
            id: req.auth.userId,
            name: req.auth.name,
            role: req.auth.role,
        },
        sessionId: req.auth.sessionId,
    });
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: End the current session
 *     responses:
 *       204:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
app.post('/api/auth/logout', authMiddleware, async (req: Request, res: Response) => {
    if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
    }

    try {
        await authService.endOpenSession(req.auth.userId);
        res.status(204).send();
    } catch (error) {
        console.error('Logout failed:', error);
        res.status(500).json({ error: 'Failed to logout user.' });
    }
});

// Add this after your middleware setup
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ── Domain routes ─────────────────────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/setup', setupRouter);
app.use('/api/payment-methods', paymentMethodsRouter);



// Serve the compiled Expo Web static files (from frontend/dist)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Any route not starting with /api should serve the frontend (SPA routing)
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});