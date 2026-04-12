import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

export type JwtClaims = {
  sub: string;
  role: 'owner' | 'staff';
  name: string;
  sid: string;
};

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '8h';

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable.');
}

function getJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }

  return JWT_SECRET;
}

export function signAccessToken(claims: JwtClaims): string {
  return jwt.sign(claims, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token: string): JwtClaims {
  const payload = jwt.verify(token, getJwtSecret());

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid token payload.');
  }

  const { sub, role, name, sid } = payload as Partial<JwtClaims>;

  if (!sub || !role || !name || !sid) {
    throw new Error('Token payload is missing required claims.');
  }

  if (role !== 'owner' && role !== 'staff') {
    throw new Error('Token payload has invalid role claim.');
  }

  return {
    sub,
    role,
    name,
    sid,
  };
}

export function getJwtExpiresIn(): SignOptions['expiresIn'] {
  return JWT_EXPIRES_IN;
}
