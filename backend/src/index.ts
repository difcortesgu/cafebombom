const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

import { exec } from 'child_process';
import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs';
import { ensureLogosDir, ensureProductImagesDir } from './database';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/request-logger';
import { swaggerDocs, swaggerUi } from './middleware/swagger';
import accountsRouter from './routes/accounts';
import backupRouter from './routes/backup';
import inventoryRouter from './routes/inventory';
import pairingRouter from './routes/pairing';
import paymentMethodsRouter from './routes/payment-methods';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import setupRouter from './routes/setup';
import usersRouter from './routes/users';
import { AuthSqliteService } from './services/auth';
import { getJwtExpiresIn, signAccessToken } from './services/jwt';
import { startBackupScheduler } from './services/backup';
import { applyUpdate, checkForUpdate } from './services/updater';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errors';
import { resolvePairingInfo } from './utils/network';

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '10mb';
const authService = new AuthSqliteService();

try {
    const logosDir = ensureLogosDir();
    logger.info(`[STARTUP] Carpeta de logos: ${logosDir}`);
    const productImagesDir = ensureProductImagesDir();
    logger.info(`[STARTUP] Carpeta de imágenes de productos: ${productImagesDir}`);
} catch (error) {
    logger.error('No se pudo preparar las carpetas de datos.', error);
    process.exit(1);
}

// Middleware
app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN } : undefined));
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(requestLogger);

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

    const user = await authService.authenticate({ userId, pin });
    if (!user) {
        logger.warn(`[AUTH] Login fallido para userId=${userId}`);
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
    }

    const sessionId = await authService.startSession(user.id);
    logger.info(`[AUTH] Login exitoso user=${user.id} role=${user.role}`);
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

    await authService.endOpenSession(req.auth.userId);
    logger.info(`[AUTH] Logout user=${req.auth.userId}`);
    res.status(204).send();
});

// Add this after your middleware setup
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ── App version ───────────────────────────────────────────────────────────────
// APP_VERSION is inlined at compile time by `bun build --define` (see CI).
// Falls back to the env var (dev) or 'dev' when running uncompiled.
const APP_VERSION = process.env.APP_VERSION || 'dev';
app.get('/api/version', (_req: Request, res: Response) => {
    res.json({ version: APP_VERSION });
});

// ── Self-update (desktop) ─────────────────────────────────────────────────────
// Reports whether a newer GitHub release exists.
app.get('/api/update/check', async (_req: Request, res: Response) => {
    try {
        const result = await checkForUpdate();
        res.json(result);
    } catch (error) {
        logger.error('[UPDATE] Falló la verificación de actualización.', error);
        res.status(502).json({ error: 'No se pudo verificar actualizaciones.' });
    }
});

// Downloads the latest release and applies it; the process exits to let a helper
// swap the files and relaunch. Left unauthenticated so the update can run before
// the user logs in (the update prompt appears on launch).
app.post('/api/update/apply', async (_req: Request, res: Response) => {
    try {
        const { latestVersion } = await applyUpdate();
        res.json({ status: 'updating', version: latestVersion });
    } catch (error) {
        logger.error('[UPDATE] Falló la actualización.', error);
        const message = error instanceof Error ? error.message : 'No se pudo aplicar la actualización.';
        res.status(500).json({ error: message });
    }
});

// ── Domain routes ─────────────────────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/setup', setupRouter);
app.use('/api/payment-methods', paymentMethodsRouter);
app.use('/api/pairing', pairingRouter);
app.use('/api/backup', backupRouter);

const exeDir = path.dirname(process.execPath);
const isProduction = process.execPath.endsWith('.exe') || fs.existsSync(path.join(exeDir, 'public'));

const baseDir = isProduction ? exeDir : process.cwd();
const frontendDistPath = path.join(baseDir, 'public');

app.use(express.static(frontendDistPath));

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Central error handler — must be registered last, after all routes.
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`✅ Servidor POS Iniciado en puerto ${PORT}`);
    startBackupScheduler();
    const pairing = resolvePairingInfo(PORT);
    if (pairing.payload && pairing.url) {
        logger.info(`📲 Pairing QR payload: ${pairing.payload}`);
        logger.info(`🌐 Backend LAN URL: ${pairing.url}`);
    } else {
        logger.info('⚠️ No se detectó IPv4 LAN para pairing automático.');
    }

    if (isProduction) {
        const url = `http://localhost:${PORT}`;
        let command = '';

        if (process.platform === 'win32') {
            // Windows
            command = `start chrome --app="${url}" || start "" "${url}"`;
        } else {
            // Linux
            command = `chromium-browser --app="${url}" || xdg-open "${url}"`;
        }
        logger.info(`Abriendo navegador automáticamente en: ${url}`);

        exec(command, (error) => {
            if (error) {
                logger.error(`No se pudo abrir el navegador automáticamente: ${error.message}`);
            }
        });
    }
});