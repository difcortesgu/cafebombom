import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { PayrollPanel } from '@/components/payroll-panel';
import { EmployeePanelForm } from '@/components/team/employee-panel-form';
import { EmployeesTab } from '@/components/team/employees-tab';
import { PayrollTab } from '@/components/team/payroll-tab';
import { UserPanelForm } from '@/components/team/user-panel-form';
import { UsersTab } from '@/components/team/users-tab';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedChip } from '@/components/ui/themed-chip';
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
    const { openOrNavigate } = useResponsiveOpen();
    const panel = usePanelLifecycle();
    const payrollPanel = usePanelLifecycle();
    const userPanel = usePanelLifecycle();
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
    const [editingUser, setEditingUser] = useState<import('@/types/auth').ManagedUser | undefined>(undefined);

    const { hydrateManagedUsers, managedUsers, currentUser, deactivateUser, reactivateUser, hardDeleteUser } = useAuthStore();
    const { hydrate, employees, payroll, deleteEmployee, setEmployeeActive } = useAccountsStore();
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
        openOrNavigate(
            () => { setEditingEmployee(employee); panel.open(); },
            { pathname: '/employee-form', params: { id: employee.id } },
        );
    }

    function handleAddUser() {
        openOrNavigate(
            () => { setEditingUser(undefined); userPanel.open(); },
            '/user-form',
        );
    }

    function handleEditUser(user: import('@/types/auth').ManagedUser) {
        openOrNavigate(
            () => { setEditingUser(user); userPanel.open(); },
            { pathname: '/user-form', params: { id: user.id } },
        );
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
                        <ThemedText type="subtitle" style={styles.headerTitle}>{t('accounts.employees.roster')}</ThemedText>
                        <ThemedButton
                            icon="add"
                            size="sm"
                            label={t('accounts.employees.add')}
                            onPress={handleAddEmployee}
                        />
                    </View>
                ) : null}

                {section === 'payroll' ? (
                    <View style={styles.headerRow}>
                        <ThemedText type="subtitle" style={styles.headerTitle}>{t('accounts.payroll.recent')}</ThemedText>
                        <ThemedButton
                            icon="add"
                            size="sm"
                            label={t('accounts.payroll.add')}
                            onPress={() => openOrNavigate(() => payrollPanel.open(), '/payroll-form')}
                        />
                    </View>
                ) : null}

                {section === 'users' ? (
                    <View style={styles.headerRow}>
                        <ThemedText type="subtitle" style={styles.headerTitle}>{t('settings.accounts.title')}</ThemedText>
                        <ThemedButton
                            icon="add"
                            size="sm"
                            label={t('setup.account.add')}
                            onPress={handleAddUser}
                        />
                    </View>
                ) : null}

                {section === 'users' ? (
                    <UsersTab
                        users={managedUsers}
                        currentUserId={currentUser?.id ?? null}
                        gap={GRID_GAP}
                        palette={palette}
                        onEdit={handleEditUser}
                        onDeactivate={(id) => {
                            const name = managedUsers.find((u) => u.id === id)?.name ?? 'Usuario';
                            void deactivateUser(id).then(() => toast.success(`Usuario "${name}" desactivado.`));
                        }}
                        onReactivate={(id) => {
                            const name = managedUsers.find((u) => u.id === id)?.name ?? 'Usuario';
                            void reactivateUser(id).then(() => toast.success(`Usuario "${name}" reactivado.`));
                        }}
                        onHardDelete={(id) => {
                            const name = managedUsers.find((u) => u.id === id)?.name ?? 'Usuario';
                            void hardDeleteUser(id).then(() => toast.success(`Usuario "${name}" eliminado correctamente.`));
                        }}
                    />
                ) : null}
                {section === 'employees' ? (
                    <EmployeesTab
                        employees={employees}
                        gap={GRID_GAP}
                        palette={palette}
                        onEdit={handleEditEmployee}
                        onDelete={(id) => {
                            const name = employees.find((e) => e.id === id)?.name ?? 'Empleado';
                            void deleteEmployee(id).then(() => toast.success(`Empleado "${name}" eliminado correctamente.`));
                        }}
                        onToggleActive={(id, isActive) => {
                            const name = employees.find((e) => e.id === id)?.name ?? 'Empleado';
                            void setEmployeeActive(id, !isActive).then(() =>
                                toast.success(isActive ? `Empleado "${name}" deshabilitado.` : `Empleado "${name}" habilitado.`),
                            );
                        }}
                    />
                ) : null}
                {section === 'payroll' ? (
                    <PayrollTab
                        payroll={payroll}
                        employees={employees}
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
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        flex: 1,
        minWidth: 120,
    },
});
