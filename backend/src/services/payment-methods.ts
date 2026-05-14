import { db } from '@/database';
import { paymentMethods } from '@/database/schema';
import type { PaymentMethodConfig } from '@/types/payment-methods';
import { asc, eq, sql } from 'drizzle-orm';

export class PaymentMethodsSqliteService {
    async getAll(): Promise<PaymentMethodConfig[]> {
        const result = db
            .select({
                id: paymentMethods.id,
                name: paymentMethods.name,
                is_active: paymentMethods.isActive,
                created_at: paymentMethods.createdAt,
                updated_at: paymentMethods.updatedAt,
            })
            .from(paymentMethods)
            .orderBy(asc(paymentMethods.name))
            .all() as PaymentMethodConfig[];
        return result;
    }

    async getActive(): Promise<PaymentMethodConfig[]> {
        const result = db
            .select({
                id: paymentMethods.id,
                name: paymentMethods.name,
                is_active: paymentMethods.isActive,
                created_at: paymentMethods.createdAt,
                updated_at: paymentMethods.updatedAt,
            })
            .from(paymentMethods)
            .where(eq(paymentMethods.isActive, true))
            .orderBy(asc(paymentMethods.name))
            .all() as PaymentMethodConfig[];
        return result;
    }

    async getById(id: string): Promise<PaymentMethodConfig | null> {
        const result = db
            .select({
                id: paymentMethods.id,
                name: paymentMethods.name,
                is_active: paymentMethods.isActive,
                created_at: paymentMethods.createdAt,
                updated_at: paymentMethods.updatedAt,
            })
            .from(paymentMethods)
            .where(eq(paymentMethods.id, id))
            .get() as PaymentMethodConfig | undefined;
        return result ?? null;
    }

    async create(name: string): Promise<string> {
        const result = db
            .insert(paymentMethods)
            .values({ name })
            .returning({ id: paymentMethods.id })
            .get();
        return result.id;
    }

    async update(id: string, name: string, isActive: boolean): Promise<boolean> {
        const result = db
            .update(paymentMethods)
            .set({
                name,
                isActive,
                updatedAt: Math.floor(Date.now() / 1000),
            })
            .where(eq(paymentMethods.id, id))
            .run();
        return result.changes > 0;
    }

    async delete(id: string): Promise<boolean> {
        const result = db
            .delete(paymentMethods)
            .where(eq(paymentMethods.id, id))
            .run();
        return result.changes > 0;
    }

    async seedDefaultMethods(): Promise<void> {
        const existing = db
            .select({ count: sql`COUNT(*)` })
            .from(paymentMethods)
            .get();

        if (existing && (existing.count as number) === 0) {
            db.insert(paymentMethods)
                .values([
                    { name: 'Efectivo' },
                    { name: 'Tarjeta' },
                    { name: 'Transferencia' },
                ])
                .run();
        }
    }
}
