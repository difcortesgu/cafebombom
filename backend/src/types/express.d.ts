import type { AuthenticatedRequestUser } from '@/middleware/auth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestUser;
    }
  }
}

export { };

