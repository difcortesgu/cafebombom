import { paymentMethodsService } from '@/services';
import { logger } from '@/services/logger';
import type { PaymentMethodConfig } from '@/types/payment-methods';
import { create } from 'zustand';

interface PaymentMethodsStore {
    methods: PaymentMethodConfig[];
    loading: boolean;
    hydrate: () => Promise<void>;
    hydrateAll: () => Promise<void>;
    addMethod: (name: string, icon?: string) => Promise<string>;
    updateMethod: (id: string, name: string, isActive: boolean, icon?: string) => Promise<void>;
    toggleMethod: (id: string, isActive: boolean) => Promise<void>;
    deleteMethod: (id: string) => Promise<void>;
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
            logger.error('Failed to hydrate payment methods:', error);
            set({ loading: false });
        }
    },

    hydrateAll: async () => {
        set({ loading: true });
        try {
            const methods = await paymentMethodsService.getAll();
            set({ methods, loading: false });
        } catch (error) {
            logger.error('Failed to hydrate all payment methods:', error);
            set({ loading: false });
        }
    },

    addMethod: async (name: string, icon?: string) => {
        const id = await paymentMethodsService.create(name, icon);
        const methods = await paymentMethodsService.getActive();
        set({ methods });
        return id;
    },

    updateMethod: async (id: string, name: string, isActive: boolean, icon?: string) => {
        await paymentMethodsService.update(id, name, isActive, icon);
        const methods = await paymentMethodsService.getAll();
        set({ methods });
    },

    toggleMethod: async (id: string, isActive: boolean) => {
        const currentMethod = await paymentMethodsService.getById(id);
        if (!currentMethod) return;
        await paymentMethodsService.update(id, currentMethod.name, !isActive);
        const methods = await paymentMethodsService.getAll();
        set({ methods });
    },

    deleteMethod: async (id: string) => {
        await paymentMethodsService.delete(id);
        const methods = await paymentMethodsService.getAll();
        set({ methods });
    },
}));
