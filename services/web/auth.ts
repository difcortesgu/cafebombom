import type { AuthService } from '@/services/interfaces/auth';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';
import { verifyPin } from '@/utils/hash';

import { getDb, generateId } from './storage';

export class AuthWebService implements AuthService {
  async getActiveUsers(): Promise<User[]> {
    const db = await getDb();
    return (await db.users.toArray())
      .filter((user) => user.isActive)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(({ id, name, role }) => ({ id, name, role }));
  }

  async authenticate({ userId, pin }: LoginPayload): Promise<User | null> {
    const db = await getDb();
    const user = await db.users.get(userId);

    if (!user || !user.isActive || !verifyPin(pin, user.pinHash)) {
      return null;
    }

    return { id: user.id, name: user.name, role: user.role };
  }

  async startSession(userId: string): Promise<void> {
    const db = await getDb();
    await db.sessions.add({
      id: generateId(),
      userId,
      loggedInAt: Math.floor(Date.now() / 1000),
      loggedOutAt: null,
    });
  }

  async endOpenSession(userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const db = await getDb();

    const sessions = await db.sessions
      .where('userId')
      .equals(userId)
      .toArray();

    for (const session of sessions) {
      if (session.loggedOutAt === null) {
        await db.sessions.update(session.id, { loggedOutAt: now });
      }
    }
  }
}