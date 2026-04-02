import { execute, getDb, hashPin, queryAll, queryFirst } from '@/database/db';
import type { AuthService } from '@/services/interfaces/auth';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';

type UserWithPin = User & { pin_hash: string };

export class AuthSqliteService implements AuthService {
  async getActiveUsers() {
    await getDb();
    return queryAll<User>('SELECT id, name, role FROM users WHERE is_active = 1 ORDER BY id;');
  }

  async authenticate({ userId, pin }: LoginPayload) {
    const row = await queryFirst<UserWithPin>(
      'SELECT id, name, role, pin_hash FROM users WHERE id = ? AND is_active = 1;',
      [userId]
    );

    if (!row || row.pin_hash !== hashPin(pin)) {
      return null;
    }

    return { id: row.id, name: row.name, role: row.role };
  }

  async startSession(userId: number) {
    await execute('INSERT INTO sessions (user_id) VALUES (?);', [userId]);
  }

  async endOpenSession(userId: number) {
    await execute(
      `UPDATE sessions
       SET logged_out_at = cast(strftime('%s', 'now') as int)
       WHERE user_id = ? AND logged_out_at IS NULL;`,
      [userId]
    );
  }
}
