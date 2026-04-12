import cors from 'cors';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { authMiddleware } from './middleware/auth';
import { swaggerDocs, swaggerUi } from './middleware/swagger';
import { AuthSqliteService } from './services/auth';
import { getJwtExpiresIn, signAccessToken } from './services/jwt';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const authService = new AuthSqliteService();

// Middleware
app.use(cors());
app.use(express.json());

/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to the API
 *     responses:
 *       200:
 *         description: Returns a greeting
 */
app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server is running');
});

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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});