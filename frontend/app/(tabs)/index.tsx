import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/auth';

export default function TabsIndexRoute() {
    const currentUser = useAuthStore((state) => state.currentUser);

    if (currentUser?.role === 'owner') {
        return <Redirect href="/dashboard" />;
    }

    return <Redirect href="/sales" />;
}
