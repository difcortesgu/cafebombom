import { create } from 'zustand';

import { execute, getDb, hashPin, queryAll, queryFirst } from '@/database/db';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';

type AuthState = {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  users: [],
  currentUser: null,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    await getDb();

    const users = await queryAll<User>('SELECT id, name, role FROM users WHERE is_active = 1 ORDER BY id;');
    set({ users, loading: false });
  },

  login: async ({ userId, pin }: LoginPayload) => {
    set({ loading: true, error: null });

    const row = await queryFirst<User & { pin_hash: string }>(
      'SELECT id, name, role, pin_hash FROM users WHERE id = ? AND is_active = 1;',
      [userId]
    );

    if (!row || row.pin_hash !== hashPin(pin)) {
      set({ loading: false, error: 'Invalid PIN' });
      return false;
    }

    await execute('INSERT INTO sessions (user_id) VALUES (?);', [userId]);
    set({
      currentUser: { id: row.id, name: row.name, role: row.role },
      loading: false,
      error: null,
    });

    return true;
  },

  logout: async () => {
    const user = get().currentUser;
    if (user) {
      await execute(
        `UPDATE sessions
          SET logged_out_at = cast(strftime('%s', 'now') as int)
          WHERE user_id = ? AND logged_out_at IS NULL;`,
        [user.id]
      );
    }
    set({ currentUser: null, error: null });
  },
}));
