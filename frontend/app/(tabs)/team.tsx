import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmployeesTab } from '@/components/team/employees-tab';
import { PayrollTab } from '@/components/team/payroll-tab';
import { UsersTab } from '@/components/team/users-tab';
import { ThemedText } from '@/components/themed-text';
import { ThemedChip } from '@/components/ui/themed-chip';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type Section = 'users' | 'employees' | 'payroll';

export default function TeamScreen() {
    const [section, setSection] = useState<Section>('users');

    const { hydrateManagedUsers } = useAuthStore();
    const { hydrate } = useAccountsStore();
    const { hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrateManagedUsers(), hydrate(), hydratePaymentMethods()]);
        }, [hydrate, hydrateManagedUsers, hydratePaymentMethods]),
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('team.title')}</ThemedText>
            <ThemedText>{t('team.subtitle')}</ThemedText>

            <View style={styles.tabRow}>
                {(['users', 'employees', 'payroll'] as Section[]).map((item) => (
                    <ThemedChip
                        key={item}
                        style={styles.sectionButton}
                        label={item === 'users' ? t('team.tab.users') : item === 'employees' ? t('team.tab.employees') : t('team.tab.payroll')}
                        active={section === item}
                        onPress={() => setSection(item)}
                    />
                ))}
            </View>

            {section === 'users' ? <UsersTab /> : null}
            {section === 'employees' ? <EmployeesTab /> : null}
            {section === 'payroll' ? <PayrollTab /> : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    tabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sectionButton: {
        borderRadius: 10,
    },
});
