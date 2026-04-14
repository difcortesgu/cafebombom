import { create } from 'zustand';

import { t } from '@/i18n';
import { authService, setupService } from '@/services';
import type { CreateUserPayload, LoginPayload, ManagedUser, SetupUpdateUserPayload, UpdateOwnProfilePayload } from '@/types/auth';
import type { User } from '@/types/types';

type AuthState = {
  users: User[];
  managedUsers: ManagedUser[];
  currentUser: User | null;
  isSetupDone: boolean | null;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  hydrateManagedUsers: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<User | null>;
  setupCreateUser: (payload: CreateUserPayload) => Promise<User | null>;
  deactivateUser: (targetUserId: string) => Promise<boolean>;
  reactivateUser: (targetUserId: string) => Promise<boolean>;
  hardDeleteUser: (targetUserId: string) => Promise<boolean>;
  setupDeleteUser: (targetUserId: string) => Promise<boolean>;
  setupReactivateUser: (targetUserId: string) => Promise<boolean>;
  setupHardDeleteUser: (targetUserId: string) => Promise<boolean>;
  setupUpdateUser: (userId: string, payload: SetupUpdateUserPayload) => Promise<User | null>;
  updateCurrentUserProfile: (payload: UpdateOwnProfilePayload) => Promise<boolean>;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  users: [],
  managedUsers: [],
  currentUser: null,
  isSetupDone: null,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const status = await setupService.getSetupStatus();

      if (!status.isSetupDone) {
        const managedUsers = await authService.getSetupUsers();
        const users = managedUsers
          .filter((user) => user.isActive)
          .map((user) => ({ id: user.id, name: user.name, role: user.role }));

        set({ users, managedUsers, currentUser: null, isSetupDone: false, loading: false, error: null });
        return;
      }

      const users = await authService.getActiveUsers();
      set({ users, managedUsers: [], currentUser: null, isSetupDone: true, loading: false, error: null });
    } catch (err) {
      set({
        users: [],
        managedUsers: [],
        currentUser: null,
        isSetupDone: null,
        loading: false,
        error: String((err as Error)?.message ?? err),
      });
    }
  },

  hydrateManagedUsers: async () => {
    set({ loading: true, error: null });
    const managedUsers = await authService.getAllUsers();
    set({ managedUsers, loading: false });
  },

  createUser: async ({ name, role, pin }: CreateUserPayload) => {
    set({ loading: true, error: null });
    const created = await authService.createUser({ name, role, pin });
    const [users, managedUsers] = await Promise.all([
      authService.getActiveUsers(),
      authService.getAllUsers(),
    ]);

    if (!created) {
      set({ users, managedUsers, loading: false, error: t('auth.error.createUserFailed') });
      return null;
    }

    set({ users, managedUsers, loading: false, error: null });
    return created;
  },

  setupCreateUser: async ({ name, role, pin }: CreateUserPayload) => {
    set({ loading: true, error: null });
    try {
      const created = await authService.setupCreateUser({ name, role, pin });
      const users = await authService.getActiveUsers();

      if (!created) {
        const managedUsers = await authService.getSetupUsers();
        set({ users, managedUsers, loading: false, error: t('auth.error.createUserFailed') });
        return null;
      }

      // After creating the first owner, setup routes become auth-guarded.
      // Keep the local list stable until login hydrates owner-managed users.
      let managedUsers = await authService.getSetupUsers();
      if (created.role === 'owner' && managedUsers.length === 0) {
        managedUsers = [
          ...get().managedUsers,
          { id: created.id, name: created.name, role: created.role, isActive: true },
        ];
      }

      const isSetupDone = users.some((user) => user.role === 'owner');
      set({ users, managedUsers, isSetupDone, loading: false, error: null });
      return created;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return null;
    }
  },

  setupDeleteUser: async (targetUserId: string) => {
    set({ loading: true, error: null });
    try {
      await authService.setupDeleteUser(targetUserId);
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getSetupUsers(),
      ]);
      const isSetupDone = users.some((user) => user.role === 'owner');
      set({ users, managedUsers, isSetupDone, loading: false, error: null });
      return true;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return false;
    }
  },

  setupReactivateUser: async (targetUserId: string) => {
    set({ loading: true, error: null });
    try {
      await authService.setupReactivateUser(targetUserId);
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getSetupUsers(),
      ]);
      const isSetupDone = users.some((user) => user.role === 'owner');
      set({ users, managedUsers, isSetupDone, loading: false, error: null });
      return true;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return false;
    }
  },

  setupHardDeleteUser: async (targetUserId: string) => {
    set({ loading: true, error: null });
    try {
      await authService.setupHardDeleteUser(targetUserId);
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getSetupUsers(),
      ]);
      const isSetupDone = users.some((user) => user.role === 'owner');
      set({ users, managedUsers, isSetupDone, loading: false, error: null });
      return true;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return false;
    }
  },

  setupUpdateUser: async (userId: string, payload: SetupUpdateUserPayload) => {
    set({ loading: true, error: null });
    try {
      const updated = await authService.setupUpdateUser(userId, payload);
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getSetupUsers(),
      ]);
      const isSetupDone = users.some((user) => user.role === 'owner');
      set({ users, managedUsers, isSetupDone, loading: false, error: null });
      return updated;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return null;
    }
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
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getAllUsers(),
      ]);
      const currentUser = users.find((user) => user.id === actor.id) ?? null;
      set({ users, managedUsers, currentUser, loading: false, error: null });
      return true;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return false;
    }
  },

  reactivateUser: async (targetUserId: string) => {
    const actor = get().currentUser;
    if (!actor) {
      set({ error: 'No active session user.' });
      return false;
    }

    set({ loading: true, error: null });
    try {
      await authService.reactivateUser(actor.id, targetUserId);
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getAllUsers(),
      ]);
      const currentUser = users.find((user) => user.id === actor.id) ?? null;
      set({ users, managedUsers, currentUser, loading: false, error: null });
      return true;
    } catch (err) {
      set({ loading: false, error: String((err as Error)?.message ?? err) });
      return false;
    }
  },

  hardDeleteUser: async (targetUserId: string) => {
    const actor = get().currentUser;
    if (!actor) {
      set({ error: 'No active session user.' });
      return false;
    }

    set({ loading: true, error: null });
    try {
      await authService.hardDeleteUser(actor.id, targetUserId);
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getAllUsers(),
      ]);
      const currentUser = users.find((user) => user.id === actor.id) ?? null;
      set({ users, managedUsers, currentUser, loading: false, error: null });
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
      const [users, managedUsers] = await Promise.all([
        authService.getActiveUsers(),
        authService.getAllUsers(),
      ]);
      const currentUser = updated ?? users.find((user) => user.id === actor.id) ?? null;
      set({ users, managedUsers, currentUser, loading: false, error: null });
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
      set({ loading: false, error: t('auth.error.invalidPin') });
      return false;
    }

    const users = await authService.getActiveUsers();
    const managedUsers = user.role === 'owner' ? await authService.getAllUsers() : [];

    set({
      users,
      managedUsers,
      currentUser: user,
      isSetupDone: true,
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
    const users = await authService.getActiveUsers();
    set({ currentUser: null, users, error: null });
  },
}));
