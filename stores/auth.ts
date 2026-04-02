import { create } from 'zustand';

import { authService } from '@/services';
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
    const users = await authService.getActiveUsers();
    set({ users, loading: false });
  },

  login: async ({ userId, pin }: LoginPayload) => {
    set({ loading: true, error: null });

    const user = await authService.authenticate({ userId, pin });

    if (!user) {
      set({ loading: false, error: 'Invalid PIN' });
      return false;
    }

    await authService.startSession(userId);
    set({
      currentUser: user,
      loading: false,
      error: null,
    });

    return true;
  },

  logout: async () => {
    const user = get().currentUser;
    if (user) {
      await authService.endOpenSession(user.id);
    }
    set({ currentUser: null, error: null });
  },
}));
