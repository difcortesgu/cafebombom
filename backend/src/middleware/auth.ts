import { verifyAccessToken } from '@/services/jwt';
import type { UserRole } from '@/types/types';
import { NextFunction, Request, Response } from 'express';

type AuthenticatedRequestUser = {
  userId: string;
  role: UserRole;
  name: string;
  sessionId: string;
};

function getBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }

  try {
    const claims = verifyAccessToken(token);
    req.auth = {
      userId: claims.sub,
      role: claims.role,
      name: claims.name,
      sessionId: claims.sid,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    next();
  };
}

export type { AuthenticatedRequestUser };
