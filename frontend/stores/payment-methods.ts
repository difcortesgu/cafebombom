import { paymentMethodsService } from '@/services/payment-methods';
import type { PaymentMethodConfig } from '@/types/payment-methods';
import { create } from 'zustand';

interface PaymentMethodsStore {
    methods: PaymentMethodConfig[];
    loading: boolean;
    hydrate: () => Promise<void>;
    hydrateAll: () => Promise<void>;
    addMethod: (name: string, icon?: string) => Promise<string | null>;
    updateMethod: (id: string, name: string, isActive: boolean, icon?: string) => Promise<boolean>;
    toggleMethod: (id: string, isActive: boolean) => Promise<boolean>;
    deleteMethod: (id: string) => Promise<boolean>;
}

export const usePaymentMethodsStore = create<PaymentMethodsStore>((set) => ({
    methods: [],
    loading: false,

    hydrate: async () => {
        set({ loading: true });
        try {
            const methods = await paymentMethodsService.getActive();
            set({ methods, loading: false });
        } catch (error) {
            console.error('Failed to hydrate payment methods:', error);
            set({ loading: false });
        }
    },

    hydrateAll: async () => {
        set({ loading: true });
        try {
            const methods = await paymentMethodsService.getAll();
            set({ methods, loading: false });
        } catch (error) {
            console.error('Failed to hydrate all payment methods:', error);
            set({ loading: false });
        }
    },

    addMethod: async (name: string, icon?: string) => {
        try {
            const id = await paymentMethodsService.create(name, icon);
            if (id) {
                // Refresh the list
                const methods = await paymentMethodsService.getActive();
                set({ methods });
            }
            return id;
        } catch (error) {
            console.error('Failed to add payment method:', error);
            return null;
        }
    },

    updateMethod: async (id: string, name: string, isActive: boolean, icon?: string) => {
        try {
            const success = await paymentMethodsService.update(id, name, isActive, icon);
            if (success) {
                // Refresh the list
                const methods = await paymentMethodsService.getAll();
                set({ methods });
            }
            return success;
        } catch (error) {
            console.error('Failed to update payment method:', error);
            return false;
        }
    },

    toggleMethod: async (id: string, isActive: boolean) => {
        try {
            // Get current method to preserve name
            const currentMethod = await paymentMethodsService.getById(id);
            if (!currentMethod) return false;

            const success = await paymentMethodsService.update(id, currentMethod.name, !isActive);
            if (success) {
                // Refresh the list
                const methods = await paymentMethodsService.getAll();
                set({ methods });
            }
            return success;
        } catch (error) {
            console.error('Failed to toggle payment method:', error);
            return false;
        }
    },

    deleteMethod: async (id: string) => {
        try {
            const success = await paymentMethodsService.delete(id);
            if (success) {
                // Refresh the list
                const methods = await paymentMethodsService.getActive();
                set({ methods });
            }
            return success;
        } catch (error) {
            console.error('Failed to delete payment method:', error);
            return false;
        }
    },
}));
