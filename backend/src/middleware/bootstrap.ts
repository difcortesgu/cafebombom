import { getSetupStatus } from '@/services/bootstrap';
import { NextFunction, Request, Response } from 'express';
import { authMiddleware, requireRole } from './auth';

/**
 * Middleware that allows access only when no active owner exists (bootstrap phase).
 * Once the system has at least one active owner, it requires owner authentication.
 */
export function bootstrapOrOwnerAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getSetupStatus().isSetupDone) {
    // System is in bootstrap phase — allow unauthenticated access
    next();
    return;
  }

  // System is initialized — require owner authentication
  authMiddleware(req, res, () => {
    requireRole('owner')(req, res, next);
  });
}
