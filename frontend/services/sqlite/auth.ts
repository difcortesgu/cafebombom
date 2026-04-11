import type { AuthService } from '@/services/interfaces/auth';
import { db, dbReady } from '@/services/sqlite/database/db';
import { sales, sessions, users } from '@/services/sqlite/database/schema';
import type { CreateUserPayload, LoginPayload, ManagedUser, SetupUpdateUserPayload, UpdateOwnProfilePayload } from '@/types/auth';
import type { User } from '@/types/types';
import { hashPin, verifyPin } from '@/utils/hash';
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';

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

  async getAllUsers(): Promise<ManagedUser[]> {
    await dbReady;
    return db
      .select({ id: users.id, name: users.name, role: users.role, isActive: users.isActive })
      .from(users)
      .orderBy(asc(users.id))
      .all() as ManagedUser[];
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

  async createUser({ name, role, pin }: CreateUserPayload): Promise<User | null> {
    await dbReady;
    const normalizedName = name.trim();
    const normalizedPin = pin.trim();

    if (!normalizedName || normalizedPin.length < 4) {
      return null;
    }

    const existing = db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.name, normalizedName))
      .get();

    if (existing?.isActive) {
      return null;
    }

    if (existing && !existing.isActive) {
      db.update(users)
        .set({
          role,
          pinHash: hashPin(normalizedPin),
          isActive: true,
          updatedAt: sql`cast(strftime('%s', 'now') as int)`,
        })
        .where(eq(users.id, existing.id))
        .run();

      const reactivated = db
        .select({ id: users.id, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, existing.id))
        .get();

      if (!reactivated) {
        return null;
      }

      return {
        id: reactivated.id,
        name: reactivated.name,
        role: reactivated.role as User['role'],
      };
    }

    const [inserted] = db
      .insert(users)
      .values({
        name: normalizedName,
        role,
        pinHash: hashPin(normalizedPin),
        isActive: true,
      })
      .returning({ id: users.id, name: users.name, role: users.role })
      .all();

    if (!inserted) {
      return null;
    }

    return {
      id: inserted.id,
      name: inserted.name,
      role: inserted.role as User['role'],
    };
  }

  async deactivateUser(actorUserId: string, targetUserId: string): Promise<void> {
    await dbReady;
    if (actorUserId === targetUserId) {
      throw new Error('You cannot remove your own account.');
    }

    const actor = db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, actorUserId))
      .get();

    if (!actor || !actor.isActive || actor.role !== 'owner') {
      throw new Error('Only owner accounts can remove users.');
    }

    const target = db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, targetUserId))
      .get();

    if (!target || !target.isActive) {
      throw new Error('Target account is not active.');
    }

    if (target.role === 'owner') {
      const ownerRows = db
        .select({ total: sql<number>`cast(count(*) as int)` })
        .from(users)
        .where(and(eq(users.role, 'owner'), eq(users.isActive, true)))
        .all();
      const activeOwnerCount = Number(ownerRows[0]?.total ?? 0);
      if (activeOwnerCount <= 1) {
        throw new Error('Cannot remove the last owner account.');
      }
    }

    db.update(users)
      .set({
        isActive: false,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
      })
      .where(eq(users.id, targetUserId))
      .run();
  }

  async reactivateUser(actorUserId: string, targetUserId: string): Promise<void> {
    await dbReady;
    if (actorUserId === targetUserId) {
      throw new Error('You cannot reactivate your own account this way.');
    }

    const actor = db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, actorUserId))
      .get();

    if (!actor || !actor.isActive || actor.role !== 'owner') {
      throw new Error('Only owner accounts can reactivate users.');
    }

    const target = db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, targetUserId))
      .get();

    if (!target || target.isActive) {
      throw new Error('Target account is already active or missing.');
    }

    db.update(users)
      .set({
        isActive: true,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
      })
      .where(eq(users.id, targetUserId))
      .run();
  }

  async hardDeleteUser(actorUserId: string, targetUserId: string): Promise<void> {
    await dbReady;
    if (actorUserId === targetUserId) {
      throw new Error('You cannot permanently delete your own account.');
    }

    const actor = db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, actorUserId))
      .get();

    if (!actor || !actor.isActive || actor.role !== 'owner') {
      throw new Error('Only owner accounts can permanently delete users.');
    }

    const target = db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, targetUserId))
      .get();

    if (!target) {
      throw new Error('Target account does not exist.');
    }

    if (target.isActive && target.role === 'owner') {
      const ownerRows = db
        .select({ total: sql<number>`cast(count(*) as int)` })
        .from(users)
        .where(and(eq(users.role, 'owner'), eq(users.isActive, true)))
        .all();
      const activeOwnerCount = Number(ownerRows[0]?.total ?? 0);
      if (activeOwnerCount <= 1) {
        throw new Error('Cannot delete the last owner account.');
      }
    }

    const salesRows = db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(sales)
      .where(or(eq(sales.staffId, targetUserId), eq(sales.discountAppliedBy, targetUserId)))
      .all();
    const linkedSalesCount = Number(salesRows[0]?.total ?? 0);

    if (linkedSalesCount > 0) {
      throw new Error('Cannot permanently delete a user with linked sales history.');
    }

    db.transaction(() => {
      db.delete(sessions).where(eq(sessions.userId, targetUserId)).run();
      db.delete(users).where(eq(users.id, targetUserId)).run();
    });
  }

  async updateOwnProfile(userId: string, payload: UpdateOwnProfilePayload): Promise<User | null> {
    await dbReady;
    const existing = db
      .select({ id: users.id, name: users.name, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .get();

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

    const duplicate = db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.name, nextName), eq(users.isActive, true)))
      .get();

    if (duplicate && duplicate.id !== userId) {
      throw new Error('Another active account already uses this name.');
    }

    const updates: Partial<typeof users.$inferInsert> = {
      name: nextName,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    if (nextPin) {
      updates.pinHash = hashPin(nextPin);
    }

    db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .run();

    const updated = db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!updated) {
      return null;
    }

    return {
      id: updated.id,
      name: updated.name,
      role: updated.role as User['role'],
    };
  }

  async setupDeleteUser(userId: string): Promise<void> {
    await dbReady;
    db.update(users)
      .set({ isActive: false, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(users.id, userId))
      .run();
  }

  async setupReactivateUser(userId: string): Promise<void> {
    await dbReady;
    db.update(users)
      .set({ isActive: true, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(users.id, userId))
      .run();
  }

  async setupHardDeleteUser(userId: string): Promise<void> {
    await dbReady;
    const salesRows = db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(sales)
      .where(or(eq(sales.staffId, userId), eq(sales.discountAppliedBy, userId)))
      .all();
    const linkedSalesCount = Number(salesRows[0]?.total ?? 0);

    if (linkedSalesCount > 0) {
      throw new Error('Cannot permanently delete a user with linked sales history.');
    }

    db.transaction(() => {
      db.delete(sessions).where(eq(sessions.userId, userId)).run();
      db.delete(users).where(eq(users.id, userId)).run();
    });
  }

  async setupUpdateUser(userId: string, payload: SetupUpdateUserPayload): Promise<User | null> {
    await dbReady;
    const existing = db
      .select({ id: users.id, name: users.name, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .get();

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

    const duplicate = db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.name, nextName), eq(users.isActive, true)))
      .get();

    if (duplicate && duplicate.id !== userId) {
      throw new Error('Another active account already uses this name.');
    }

    const updates: Partial<typeof users.$inferInsert> = {
      name: nextName,
      role: nextRole,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    if (nextPin) {
      updates.pinHash = hashPin(nextPin);
    }

    db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .run();

    const updated = db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!updated) {
      return null;
    }

    return { id: updated.id, name: updated.name, role: updated.role as User['role'] };
  }

  async startSession(userId: string): Promise<string> {
    await dbReady;
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
    await dbReady;
    db.update(sessions)
      .set({ loggedOutAt: sql`cast(strftime('%s', 'now') as int)` })
      .where(and(eq(sessions.userId, userId), isNull(sessions.loggedOutAt)))
      .run();
  }
}
