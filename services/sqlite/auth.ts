import { db } from '@/database/db';
import { sessions, users } from '@/database/schema';
import type { AuthService } from '@/services/interfaces/auth';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';
import { hashPin } from '@/utils/hash';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

export class AuthSqliteService implements AuthService {
  async getActiveUsers(): Promise<User[]> {
    return db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(asc(users.id))
      .all() as User[];
  }

  async authenticate({ userId, pin }: LoginPayload): Promise<User | null> {
    const row = db
      .select({ id: users.id, name: users.name, role: users.role, pinHash: users.pinHash })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .get();

    if (!row || row.pinHash !== hashPin(pin)) {
      return null;
    }

    return { id: row.id, name: row.name, role: row.role as User['role'] };
  }

  async startSession(userId: number): Promise<void> {
    db.insert(sessions).values({ userId }).run();
  }

  async endOpenSession(userId: number): Promise<void> {
    db.update(sessions)
      .set({ loggedOutAt: sql`cast(strftime('%s', 'now') as int)` })
      .where(and(eq(sessions.userId, userId), isNull(sessions.loggedOutAt)))
      .run();
  }
}
