import { db } from '@/database';
import { users } from '@/database/schema';
import { and, eq, sql } from 'drizzle-orm';

export type SetupStatus = {
  isSetupDone: boolean;
  activeOwnerCount: number;
};

export function getSetupStatus(): SetupStatus {
  const row = db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(and(eq(users.role, 'owner'), eq(users.isActive, true)))
    .get();

  const activeOwnerCount = Number(row?.count ?? 0);

  return {
    isSetupDone: activeOwnerCount > 0,
    activeOwnerCount,
  };
}