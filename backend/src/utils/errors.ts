import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

/**
 * A typed application error that carries an HTTP status code.
 * Services should throw this for known, handleable error conditions
 * (validation failures, conflicts, missing resources). The central
 * error handler forwards the status code and message to the client
 * without logging it as an unexpected error.
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 422,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Central Express error-handling middleware. Registered once, after all routes.
 * - AppError instances are expected/handleable: respond with their status code
 *   and message (no error-level logging — they're not bugs).
 * - Anything else is an unexpected failure: log it once with its stack trace and
 *   respond with a generic 500.
 *
 * This is the single place where unhandled errors are logged and turned into
 * responses, so controllers no longer repeat that boilerplate.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (res.headersSent) {
        return;
    }

    if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
    }

    // Schema validation failures are client errors: respond 400 with the first
    // issue's message (no error-level logging — bad input is not a bug).
    if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request.' });
        return;
    }

    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
}
