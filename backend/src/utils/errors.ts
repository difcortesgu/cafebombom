import type { Response } from 'express';
import { logger } from './logger';

/**
 * A typed application error that carries an HTTP status code.
 * Services should throw this for known, handleable error conditions.
 * Controllers catch it and respond with the appropriate status.
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

type ControllerContext = {
    /** Label used in logger.error output, e.g. '[sales] createSale' */
    label: string;
    /** Default 500 error message sent to the client */
    fallbackMessage: string;
};

/**
 * Handles an error caught in a controller function.
 * - AppError instances are forwarded with their status code and message.
 * - Unknown errors are logged and responded to with 500.
 */
export function handleControllerError(error: unknown, res: Response, ctx: ControllerContext): void {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
    }
    logger.error(`${ctx.label} failed:`, error);
    res.status(500).json({ error: ctx.fallbackMessage });
}
