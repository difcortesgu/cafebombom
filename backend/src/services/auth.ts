import { db } from '@/database';
import { sessions, users } from '@/database/schema';
import { verifyPin } from '@/services/hash';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';
import { and, eq, isNull, sql } from 'drizzle-orm';

export class AuthSqliteService {
  async authenticate({ userId, pin }: LoginPayload): Promise<User | null> {
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

  async startSession(userId: string): Promise<string> {
    const [inserted] = db.insert(sessions)
      .values({ userId })
      .returning({ id: sessions.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create session.');
    }

    return inserted.id;
  }

  async endOpenSession(userId: string): Promise<void> {
    db.update(sessions)
      .set({ loggedOutAt: sql`cast(strftime('%s', 'now') as int)` })
      .where(and(eq(sessions.userId, userId), isNull(sessions.loggedOutAt)))
      .run();
  }
}
