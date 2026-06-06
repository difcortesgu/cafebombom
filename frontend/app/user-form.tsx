import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { UserForm } from '@/components/team/user-form';
import { FormScreen } from '@/components/ui/form-screen';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

export default function UserFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();
    const { managedUsers } = useAuthStore();

    const editingUser = params.id ? managedUsers.find((u) => u.id === params.id) : undefined;

    return (
        <FormScreen>
            <ThemedText type="title">
                {editingUser ? t('setup.account.editTitle') : t('setup.account.add')}
            </ThemedText>
            <UserForm editingUser={editingUser} onClose={() => router.back()} />
        </FormScreen>
    );
}
