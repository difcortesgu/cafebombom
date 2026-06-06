import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { ThemedText } from '@/components/themed-text';
import { EmployeeForm } from '@/components/team/employee-form';
import { FormScreen } from '@/components/ui/form-screen';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';

export default function EmployeeFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();
    const { employees, hydrate } = useAccountsStore();

    const editingEmployee = params.id ? employees.find((e) => e.id === params.id) : undefined;

    useFocusEffect(
        useCallback(() => {
            void hydrate();
        }, [hydrate]),
    );

    return (
        <FormScreen>
            <ThemedText type="title">
                {editingEmployee ? t('accounts.employees.edit') : t('accounts.employees.add')}
            </ThemedText>
            <EmployeeForm employee={editingEmployee} onClose={() => router.back()} />
        </FormScreen>
    );
}
