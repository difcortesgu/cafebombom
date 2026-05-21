import { useAuthStore } from '@/stores/auth';
import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

const OWNER_ROUTES = new Set(['dashboard', 'catalog', 'operations', 'team']);
const STAFF_ROUTES = new Set(['sales', 'cash-register', 'restock', 'expenses']);

export function useRoleRouter() {
    const { currentUser } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!currentUser) return;
        const currentRoute = pathname.replace(/^\//, '').split('/')[0] ?? '';

        if (currentUser.role === 'owner' && STAFF_ROUTES.has(currentRoute)) {
            router.replace('/dashboard');
            return;
        }
        if (currentUser.role !== 'owner' && OWNER_ROUTES.has(currentRoute)) {
            router.replace('/sales');
        }
    }, [currentUser, pathname, router]);
}
