import { create } from 'zustand';

import { t } from '@/i18n';
import { authService } from '@/services';
import type { CreateUserPayload, LoginPayload, UpdateOwnProfilePayload } from '@/types/auth';
import type { User } from '@/types/types';

type AuthState = {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<User | null>;
  deactivateUser: (targetUserId: string) => Promise<boolean>;
  updateCurrentUserProfile: (payload: UpdateOwnProfilePayload) => Promise<boolean>;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
};

const pickDevUser = (users: User[]): User | null => {
  if (users.length === 0) {
    return null;
  }
  return users.find((user) => user.role === 'owner') ?? users[0];
};

export const useAuthStore = create<AuthState>((set, get) => ({
  users: [],
  currentUser: null,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    const users = await authService.getActiveUsers();

    if (__DEV__) {
      const devUser = pickDevUser(users);
      set({ users, currentUser: devUser, loading: false, error: null });
      return;
    }

    set({ users, loading: false });
  },

  createUser: async ({ name, role, pin }: CreateUserPayload) => {
    set({ loading: true, error: null });
    const created = await authService.createUser({ name, role, pin });
    const users = await authService.getActiveUsers();

    if (!created) {
      set({ users, loading: false, error: t('Could not create user. Verify unique name and PIN length.') });
      return null;
    }

    set({ users, loading: false, error: null });
    return created;
  },

  deactivateUser: async (targetUserId: string) => {
    const actor = get().currentUser;
    if (!actor) {
      set({ error: 'No active session user.' });
      return false;
    }

    set({ loading: true, error: null });
    try {
      await authService.deactivateUser(actor.id, targetUserId);
      const users = await authService.getActiveUsers();
      const currentUser = users.find((user) => user.id === actor.id) ?? null;
      set({ users, currentUser, loading: false, error: null });
      return true;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return false;
    }
  },

  updateCurrentUserProfile: async (payload: UpdateOwnProfilePayload) => {
    const actor = get().currentUser;
    if (!actor) {
      set({ error: 'No active session user.' });
      return false;
    }

    set({ loading: true, error: null });
    try {
      const updated = await authService.updateOwnProfile(actor.id, payload);
      const users = await authService.getActiveUsers();
      const currentUser = updated ?? users.find((user) => user.id === actor.id) ?? null;
      set({ users, currentUser, loading: false, error: null });
      return Boolean(updated);
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return false;
    }
  },

  login: async ({ userId, pin }: LoginPayload) => {
    set({ loading: true, error: null });

    const user = await authService.authenticate({ userId, pin });

    if (!user) {
      set({ loading: false, error: t('Invalid PIN') });
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
    if (__DEV__) {
      const devUser = pickDevUser(get().users);
      set({ currentUser: devUser, error: null });
      return;
    }

    const user = get().currentUser;
    if (user) {
      await authService.endOpenSession(user.id);
    }
    set({ currentUser: null, error: null });
  },
}));
