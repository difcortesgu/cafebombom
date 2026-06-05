import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Logs one line per API request once the response finishes, capturing
 * method, path, status, duration and (if authenticated) the user id.
 * Static asset requests (anything not under /api) are skipped to keep
 * the logs focused on meaningful application traffic.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    if (!req.originalUrl.startsWith('/api')) {
        next();
        return;
    }

    const start = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const userId = req.auth?.userId;
        const userPart = userId ? ` user=${userId}` : '';
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms${userPart}`;

        if (res.statusCode >= 500) {
            logger.error(message);
        } else if (res.statusCode >= 400) {
            logger.warn(message);
        } else {
            logger.info(message);
        }
    });

    next();
}
