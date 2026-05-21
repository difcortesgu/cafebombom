import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import { useEffect, useState } from 'react';

export function useBootHydration() {
    const [bootHydrated, setBootHydrated] = useState(false);
    const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);

    const { currentUser, hydrate: hydrateAuth } = useAuthStore();
    const { hydrate: hydrateInventory } = useInventoryStore();
    const { hydrate: hydrateProducts } = useProductsStore();
    const { hydrate: hydrateAccounts } = useAccountsStore();

    useEffect(() => {
        let cancelled = false;
        void hydrateAuth().finally(() => {
            if (!cancelled) setBootHydrated(true);
        });
        return () => {
            cancelled = true;
        };
    }, [hydrateAuth]);

    useEffect(() => {
        if (!currentUser || hydratedUserId === currentUser.id) {
            return;
        }
        let cancelled = false;
        const tasks: Promise<unknown>[] = [hydrateInventory(), hydrateProducts()];
        if (currentUser.role === 'staff') {
            tasks.push(hydrateAccounts());
        }
        void Promise.all(tasks).finally(() => {
            if (!cancelled) setHydratedUserId(currentUser.id);
        });
        return () => {
            cancelled = true;
        };
    }, [currentUser, hydrateAccounts, hydrateInventory, hydrateProducts, hydratedUserId]);

    useEffect(() => {
        if (currentUser) return;
        setHydratedUserId(null);
    }, [currentUser]);

    return { bootHydrated };
}
