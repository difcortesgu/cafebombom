import type { AuthService } from '@/services/interfaces/auth';
import type { CreateUserPayload, LoginPayload, ManagedUser, SetupUpdateUserPayload, UpdateOwnProfilePayload } from '@/types/auth';
import type { User } from '@/types/types';
import { hashPin, verifyPin } from '@/utils/hash';

import { getDb } from './storage';

export class AuthWebService implements AuthService {
  async getActiveUsers(): Promise<User[]> {
    const db = await getDb();
    return (await db.users.toArray())
      .filter((user) => user.isActive)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(({ id, name, role }) => ({ id, name, role }));
  }

  async getAllUsers(): Promise<ManagedUser[]> {
    const db = await getDb();
    return (await db.users.toArray())
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(({ id, name, role, isActive }) => ({ id, name, role, isActive }));
  }

  async authenticate({ userId, pin }: LoginPayload): Promise<User | null> {
    const db = await getDb();
    const user = await db.users.get(userId);

    if (!user || !user.isActive || !verifyPin(pin, user.pinHash)) {
      return null;
    }

    return { id: user.id, name: user.name, role: user.role };
  }

  async createUser({ name, role, pin }: CreateUserPayload): Promise<User | null> {
    const db = await getDb();
    const normalizedName = name.trim();
    const normalizedPin = pin.trim();

    if (!normalizedName || normalizedPin.length < 4) {
      return null;
    }

    const existing = await db.users.where('name').equals(normalizedName).first();
    if (existing?.isActive) {
      return null;
    }

    if (existing && !existing.isActive) {
      await db.users.update(existing.id, {
        role,
        pinHash: hashPin(normalizedPin),
        isActive: true,
      });

      return {
        id: existing.id,
        name: normalizedName,
        role,
      };
    }

    const id = await db.users.add({
      name: normalizedName,
      role,
      pinHash: hashPin(normalizedPin),
      isActive: true,
    });

    return {
      id,
      name: normalizedName,
      role,
    };
  }

  async deactivateUser(actorUserId: string, targetUserId: string): Promise<void> {
    const db = await getDb();
    if (actorUserId === targetUserId) {
      throw new Error('You cannot remove your own account.');
    }

    const actor = await db.users.get(actorUserId);
    if (!actor || !actor.isActive || actor.role !== 'owner') {
      throw new Error('Only owner accounts can remove users.');
    }

    const target = await db.users.get(targetUserId);
    if (!target || !target.isActive) {
      throw new Error('Target account is not active.');
    }

    if (target.role === 'owner') {
      const ownerCount = (await db.users.toArray())
        .filter((user) => user.isActive && user.role === 'owner')
        .length;
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner account.');
      }
    }

    await db.users.update(targetUserId, {
      isActive: false,
    });
  }

  async reactivateUser(actorUserId: string, targetUserId: string): Promise<void> {
    const db = await getDb();
    if (actorUserId === targetUserId) {
      throw new Error('You cannot reactivate your own account this way.');
    }

    const actor = await db.users.get(actorUserId);
    if (!actor || !actor.isActive || actor.role !== 'owner') {
      throw new Error('Only owner accounts can reactivate users.');
    }

    const target = await db.users.get(targetUserId);
    if (!target || target.isActive) {
      throw new Error('Target account is already active or missing.');
    }

    await db.users.update(targetUserId, {
      isActive: true,
    });
  }

  async hardDeleteUser(actorUserId: string, targetUserId: string): Promise<void> {
    const db = await getDb();
    if (actorUserId === targetUserId) {
      throw new Error('You cannot permanently delete your own account.');
    }

    const actor = await db.users.get(actorUserId);
    if (!actor || !actor.isActive || actor.role !== 'owner') {
      throw new Error('Only owner accounts can permanently delete users.');
    }

    const target = await db.users.get(targetUserId);
    if (!target) {
      throw new Error('Target account does not exist.');
    }

    if (target.isActive && target.role === 'owner') {
      const ownerCount = (await db.users.toArray())
        .filter((user) => user.isActive && user.role === 'owner')
        .length;
      if (ownerCount <= 1) {
        throw new Error('Cannot delete the last owner account.');
      }
    }

    const linkedSales = await db.sales
      .filter((sale) => sale.staffId === targetUserId || sale.discountAppliedBy === targetUserId)
      .count();

    if (linkedSales > 0) {
      throw new Error('Cannot permanently delete a user with linked sales history.');
    }

    await db.transaction('rw', db.users, db.sessions, async () => {
      await db.sessions.where('userId').equals(targetUserId).delete();
      await db.users.delete(targetUserId);
    });
  }

  async updateOwnProfile(userId: string, payload: UpdateOwnProfilePayload): Promise<User | null> {
    const db = await getDb();
    const existing = await db.users.get(userId);
    if (!existing || !existing.isActive) {
      return null;
    }

    const nextName = payload.name?.trim() ?? existing.name;
    const nextPin = payload.pin?.trim();

    if (!nextName) {
      throw new Error('Name cannot be empty.');
    }

    if (nextPin !== undefined && nextPin.length > 0 && nextPin.length < 4) {
      throw new Error('PIN must be at least 4 digits.');
    }

    const duplicate = await db.users.where('name').equals(nextName).first();
    if (duplicate && duplicate.id !== userId && duplicate.isActive) {
      throw new Error('Another active account already uses this name.');
    }

    await db.users.update(userId, {
      name: nextName,
      pinHash: nextPin ? hashPin(nextPin) : existing.pinHash,
    });

    const updated = await db.users.get(userId);
    if (!updated) {
      return null;
    }

    return {
      id: updated.id,
      name: updated.name,
      role: updated.role,
    };
  }

  async setupDeleteUser(userId: string): Promise<void> {
    const db = await getDb();
    await db.users.update(userId, { isActive: false });
  }

  async setupReactivateUser(userId: string): Promise<void> {
    const db = await getDb();
    await db.users.update(userId, { isActive: true });
  }

  async setupHardDeleteUser(userId: string): Promise<void> {
    const db = await getDb();
    const linkedSales = await db.sales
      .filter((sale) => sale.staffId === userId || sale.discountAppliedBy === userId)
      .count();

    if (linkedSales > 0) {
      throw new Error('Cannot permanently delete a user with linked sales history.');
    }

    await db.transaction('rw', db.users, db.sessions, async () => {
      await db.sessions.where('userId').equals(userId).delete();
      await db.users.delete(userId);
    });
  }

  async setupUpdateUser(userId: string, payload: SetupUpdateUserPayload): Promise<User | null> {
    const db = await getDb();
    const existing = await db.users.get(userId);

    if (!existing || !existing.isActive) {
      return null;
    }

    const nextName = payload.name?.trim() ?? existing.name;
    const nextPin = payload.pin?.trim();
    const nextRole = payload.role ?? existing.role;

    if (!nextName) {
      throw new Error('Name cannot be empty.');
    }

    if (nextPin !== undefined && nextPin.length > 0 && nextPin.length < 4) {
      throw new Error('PIN must be at least 4 digits.');
    }

    const duplicate = await db.users.where('name').equals(nextName).first();
    if (duplicate && duplicate.id !== userId && duplicate.isActive) {
      throw new Error('Another active account already uses this name.');
    }

    await db.users.update(userId, {
      name: nextName,
      role: nextRole,
      pinHash: nextPin ? hashPin(nextPin) : existing.pinHash,
    });

    const updated = await db.users.get(userId);
    if (!updated) {
      return null;
    }

    return { id: updated.id, name: updated.name, role: updated.role };
  }

  async startSession(userId: string): Promise<string> {
    const db = await getDb();
    return db.sessions.add({
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