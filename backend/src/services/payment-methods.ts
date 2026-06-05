import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../database';
import { paymentMethods } from '../database/schema';
import type { PaymentMethodConfig } from '../types/payment-methods';
import { AppError } from '../utils/errors';

/** Rethrows SQLite unique-constraint violations as a 409 AppError. */
function rethrowAsConflict(error: unknown, message: string): never {
    if (error instanceof Error && error.message.includes('unique')) {
        throw new AppError(message, 409);
    }
    throw error;
}

export class PaymentMethodsSqliteService {
    async getAll(): Promise<PaymentMethodConfig[]> {
        const result = db
            .select({
                id: paymentMethods.id,
                name: paymentMethods.name,
                icon: paymentMethods.icon,
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
                icon: paymentMethods.icon,
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
                icon: paymentMethods.icon,
                is_active: paymentMethods.isActive,
                created_at: paymentMethods.createdAt,
                updated_at: paymentMethods.updatedAt,
            })
            .from(paymentMethods)
            .where(eq(paymentMethods.id, id))
            .get() as PaymentMethodConfig | undefined;
        return result ?? null;
    }

    async create(name: string, icon: string = 'wallet'): Promise<string> {
        try {
            const result = db
                .insert(paymentMethods)
                .values({ name, icon })
                .returning({ id: paymentMethods.id })
                .get();
            return result.id;
        } catch (error) {
            rethrowAsConflict(error, 'Payment method already exists.');
        }
    }

    async update(id: string, name: string, isActive: boolean, icon?: string): Promise<boolean> {
        try {
            const result = db
                .update(paymentMethods)
                .set({
                    name,
                    isActive,
                    ...(icon && { icon }),
                    updatedAt: Math.floor(Date.now() / 1000),
                })
                .where(eq(paymentMethods.id, id))
                .run();
            return result.changes > 0;
        } catch (error) {
            rethrowAsConflict(error, 'Payment method name already exists.');
        }
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
                    { name: 'Efectivo', icon: 'wallet' },
                    { name: 'Tarjeta', icon: 'card' },
                    { name: 'Transferencia', icon: 'swap-horizontal' },
                ])
                .run();
        }
    }
}
