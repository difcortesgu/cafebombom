import type { AuthService } from '@/services/interfaces/auth';
import { db, dbReady } from '@/services/sqlite/database/db';
import { sessions, users } from '@/services/sqlite/database/schema';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';
import { verifyPin } from '@/utils/hash';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

export class AuthSqliteService implements AuthService {
  async getActiveUsers(): Promise<User[]> {
    await dbReady;
    return db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(asc(users.id))
      .all() as User[];
  }

  async authenticate({ userId, pin }: LoginPayload): Promise<User | null> {
    await dbReady;
    const row = db
      .select({ id: users.id, name: users.name, role: users.role, pinHash: users.pinHash })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .get();

    if (!row || !verifyPin(pin, row.pinHash)) {
      return null;
    }

    return { id: row.id, name: row.name, role: row.role as User['role'] };
  }

  async startSession(userId: string): Promise<void> {
    await dbReady;
    db.insert(sessions).values({ userId }).run();
  }

  async endOpenSession(userId: string): Promise<void> {
    await dbReady;
    db.update(sessions)
      .set({ loggedOutAt: sql`cast(strftime('%s', 'now') as int)` })
      .where(and(eq(sessions.userId, userId), isNull(sessions.loggedOutAt)))
      .run();
  }
}
