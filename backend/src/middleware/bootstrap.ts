import { db } from '../database';
import { users } from '../database/schema';
import { and, eq, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { authMiddleware, requireRole } from './auth';

/**
 * Returns whether the system has at least one active owner already created.
 * Used to decide whether setup routes require auth or are public.
 */
function hasActiveOwner(): boolean {
  const row = db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(and(eq(users.role, 'owner'), eq(users.isActive, true)))
    .get();
  return Number(row?.count ?? 0) > 0;
}

/**
 * Middleware that allows access only when no active owner exists (bootstrap phase).
 * Once the system has at least one active owner, it requires owner authentication.
 */
export function bootstrapOrOwnerAuth(req: Request, res: Response, next: NextFunction): void {
  if (!hasActiveOwner()) {
    // System is in bootstrap phase — allow unauthenticated access
    next();
    return;
  }

  // System is initialized — require owner authentication
  authMiddleware(req, res, () => {
    requireRole('owner')(req, res, next);
  });
}
