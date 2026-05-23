import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PayrollPanel } from '@/components/payroll-panel';
import { EmployeePanelForm } from '@/components/team/employee-panel-form';
import { EmployeesTab } from '@/components/team/employees-tab';
import { PayrollTab } from '@/components/team/payroll-tab';
import { UserPanelForm } from '@/components/team/user-panel-form';
import { UsersTab } from '@/components/team/users-tab';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useCatalogGrid } from '@/hooks/use-catalog-grid';
import { usePanelLifecycle } from '@/hooks/use-panel-lifecycle';
import { useResponsiveOpen } from '@/hooks/use-responsive-open';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import type { Employee } from '@/types/types';

type Section = 'users' | 'employees' | 'payroll';

const GRID_GAP = 12;
const PADDING = 16;

export default function TeamScreen() {
    const palette = useAppColors();
    const [section, setSection] = useState<Section>('users');
    const { cardWidth } = useCatalogGrid();
    const { openOrNavigate } = useResponsiveOpen();
    const panel = usePanelLifecycle();
    const payrollPanel = usePanelLifecycle();
    const userPanel = usePanelLifecycle();
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
    const [editingUser, setEditingUser] = useState<import('@/types/auth').ManagedUser | undefined>(undefined);

    const { hydrateManagedUsers, managedUsers, currentUser, deactivateUser, reactivateUser, hardDeleteUser } = useAuthStore();
    const { hydrate, employees, payroll, deleteEmployee } = useAccountsStore();
    const { hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrateManagedUsers(), hydrate(), hydratePaymentMethods()]);
        }, [hydrate, hydrateManagedUsers, hydratePaymentMethods]),
    );

    function handleAddEmployee() {
        setEditingEmployee(undefined);
        openOrNavigate(() => panel.open(), '/employee-form');
    }

    function handleEditEmployee(employee: Employee) {
        setEditingEmployee(employee);
        panel.open();
    }

    function handleAddUser() {
        setEditingUser(undefined);
        userPanel.open();
    }

    function handleEditUser(user: import('@/types/auth').ManagedUser) {
        setEditingUser(user);
        userPanel.open();
    }

    return (
        <View style={styles.screenContainer}>
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

                {section === 'employees' ? (
                    <View style={styles.headerRow}>
                        <ThemedText type="subtitle">{t('accounts.employees.roster')}</ThemedText>
                        <ThemedButton
                            icon="add"
                            label={t('accounts.employees.add')}
                            onPress={handleAddEmployee}
                        />
                    </View>
                ) : null}

                {section === 'payroll' ? (
                    <View style={styles.headerRow}>
                        <ThemedText type="subtitle">{t('accounts.payroll.recent')}</ThemedText>
                        <ThemedButton
                            icon="add"
                            label={t('accounts.payroll.add')}
                            onPress={() => payrollPanel.open()}
                        />
                    </View>
                ) : null}

                {section === 'users' ? (
                    <View style={styles.headerRow}>
                        <ThemedText type="subtitle">{t('settings.accounts.title')}</ThemedText>
                        <ThemedButton
                            icon="add"
                            label={t('setup.account.add')}
                            onPress={handleAddUser}
                        />
                    </View>
                ) : null}

                {section === 'users' ? (
                    <UsersTab
                        users={managedUsers}
                        currentUserId={currentUser?.id ?? null}
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        palette={palette}
                        onEdit={handleEditUser}
                        onDeactivate={(id) => void deactivateUser(id)}
                        onReactivate={(id) => void reactivateUser(id)}
                        onHardDelete={(id) => void hardDeleteUser(id)}
                    />
                ) : null}
                {section === 'employees' ? (
                    <EmployeesTab
                        employees={employees}
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        palette={palette}
                        onEdit={handleEditEmployee}
                        onDelete={(id) => void deleteEmployee(id)}
                    />
                ) : null}
                {section === 'payroll' ? (
                    <PayrollTab
                        payroll={payroll}
                        employees={employees}
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        palette={palette}
                    />
                ) : null}
            </ScrollView>

            {panel.mounted ? (
                <EmployeePanelForm
                    visible={panel.visible}
                    onClose={panel.close}
                    onExited={panel.onExited}
                    employee={editingEmployee}
                />
            ) : null}

            {payrollPanel.mounted ? (
                <PayrollPanel
                    visible={payrollPanel.visible}
                    onClose={payrollPanel.close}
                    onExited={payrollPanel.onExited}
                />
            ) : null}

            {userPanel.mounted ? (
                <UserPanelForm
                    visible={userPanel.visible}
                    onClose={userPanel.close}
                    onExited={userPanel.onExited}
                    editingUser={editingUser}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
    },
    container: {
        padding: PADDING,
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
});
