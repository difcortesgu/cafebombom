import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { UserAccountModal } from '@/components/user-account-modal';
import { UserManagementTable } from '@/components/user-management-table';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type Section = 'users' | 'employees' | 'payroll';

export default function TeamScreen() {
    const palette = useAppColors();
    const [section, setSection] = useState<Section>('users');

    const {
        currentUser,
        managedUsers,
        createUser,
        deactivateUser,
        reactivateUser,
        hardDeleteUser,
        hydrateManagedUsers,
        loading: authLoading,
        error: authError,
    } = useAuthStore();
    const { hydrate, employees, payroll, addEmployee, addPayroll } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [accountModalVisible, setAccountModalVisible] = useState(false);
    const [accountMessage, setAccountMessage] = useState<string | null>(null);
    const [employeeForm, setEmployeeForm] = useState({ name: '', salaryType: 'hourly' as 'hourly' | 'monthly', rate: '' });
    const [employeeMessage, setEmployeeMessage] = useState<string | null>(null);
    const [payrollForm, setPayrollForm] = useState({ employeeId: '', amount: '', paymentMethodId: '' });
    const [payrollMessage, setPayrollMessage] = useState<string | null>(null);

    const employeeOptions = useMemo(
        () => employees.map((emp) => ({ label: emp.name, value: emp.id })),
        [employees],
    );

    const methodOptions = useMemo(
        () => methods.map((m) => ({ label: m.name, value: m.id })),
        [methods],
    );

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrateManagedUsers(), hydrate(), hydratePaymentMethods()]);
        }, [hydrate, hydrateManagedUsers, hydratePaymentMethods]),
    );

    useEffect(() => {
        if (employeeOptions.length > 0 && !payrollForm.employeeId) {
            setPayrollForm((prev) => ({ ...prev, employeeId: employeeOptions[0].value }));
        }
    }, [employeeOptions, payrollForm.employeeId]);

    useEffect(() => {
        if (methodOptions.length > 0 && !payrollForm.paymentMethodId) {
            setPayrollForm((prev) => ({ ...prev, paymentMethodId: methodOptions[0].value }));
        }
    }, [methodOptions, payrollForm.paymentMethodId]);

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

            {section === 'users' ? (
                <>
                    <ThemedCard style={styles.card}>
                        <ThemedText type="subtitle">{t('settings.accounts.title')}</ThemedText>
                        <ThemedText style={styles.muted}>{t('settings.accounts.subtitle')}</ThemedText>

                        <ThemedButton
                            label={t('setup.account.add')}
                            disabled={authLoading}
                            onPress={() => {
                                setAccountMessage(null);
                                setAccountModalVisible(true);
                            }}
                        />

                        {accountMessage ? <ThemedText style={styles.muted}>{accountMessage}</ThemedText> : null}
                        {authError ? <ThemedText style={[styles.muted, { color: palette.danger }]}>{authError}</ThemedText> : null}

                        <UserManagementTable
                            users={managedUsers}
                            listTitle={t('settings.accounts.listTitle')}
                            emptyText={t('settings.accounts.none')}
                            roleLabel={(role) => (role === 'owner' ? t('auth.role.owner') : t('auth.role.staff'))}
                            activeStatusLabel={t('userManagement.status.active')}
                            inactiveStatusLabel={t('userManagement.status.softDeleted')}
                            renderActions={(user) => {
                                const canManage = currentUser?.role === 'owner' && currentUser.id !== user.id;
                                if (!canManage) {
                                    return <ThemedText style={styles.muted}>-</ThemedText>;
                                }
                                return (
                                    <View style={styles.rowActions}>
                                        {user.isActive ? (
                                            <ThemedButton
                                                variant="secondary"
                                                style={styles.smallButton}
                                                label={t('userManagement.action.softDelete')}
                                                onPress={async () => {
                                                    setAccountMessage(null);
                                                    const ok = await deactivateUser(user.id);
                                                    if (ok) setAccountMessage(t('settings.accounts.message.deactivated', { name: user.name }));
                                                }}
                                            />
                                        ) : (
                                            <ThemedButton
                                                variant="secondary"
                                                style={styles.smallButton}
                                                label={t('userManagement.action.reactivate')}
                                                onPress={async () => {
                                                    setAccountMessage(null);
                                                    const ok = await reactivateUser(user.id);
                                                    if (ok) setAccountMessage(t('settings.accounts.message.reactivated', { name: user.name }));
                                                }}
                                            />
                                        )}
                                        <ThemedButton
                                            variant="secondary"
                                            style={styles.smallButton}
                                            icon="trash.fill"
                                            accessibilityLabel={t('userManagement.action.hardDeleteA11y')}
                                            onPress={async () => {
                                                setAccountMessage(null);
                                                const ok = await hardDeleteUser(user.id);
                                                if (ok) setAccountMessage(t('settings.accounts.message.hardDeleted', { name: user.name }));
                                            }}
                                        />
                                    </View>
                                );
                            }}
                        />
                    </ThemedCard>
                </>
            ) : null}

            {section === 'employees' ? (
                <ThemedCard style={styles.card}>
                    <View style={styles.headerRow}>
                        <ThemedText type="subtitle">{t('accounts.employees.roster')}</ThemedText>
                    </View>

                    <ThemedInput
                        value={employeeForm.name}
                        placeholder={t('accounts.employees.namePlaceholder')}
                        onChangeText={(val) => setEmployeeForm((prev) => ({ ...prev, name: val }))}
                    />
                    <ThemedSelect
                        value={employeeForm.salaryType}
                        onValueChange={(val) => setEmployeeForm((prev) => ({ ...prev, salaryType: val as 'hourly' | 'monthly' }))}
                        items={[
                            { label: t('accounts.employees.hourly'), value: 'hourly' },
                            { label: t('accounts.employees.monthly'), value: 'monthly' },
                        ]}
                    />
                    <ThemedInput
                        value={employeeForm.rate}
                        placeholder={t('accounts.employees.ratePlaceholder')}
                        keyboardType="decimal-pad"
                        onChangeText={(val) => setEmployeeForm((prev) => ({ ...prev, rate: val }))}
                    />
                    <ThemedButton
                        label={t('accounts.employees.add')}
                        onPress={async () => {
                            const rate = Number(employeeForm.rate);
                            if (!employeeForm.name.trim() || !Number.isFinite(rate) || rate <= 0) {
                                setEmployeeMessage(t('accounts.employees.invalid'));
                                return;
                            }
                            await addEmployee({ name: employeeForm.name.trim(), salaryType: employeeForm.salaryType, rate });
                            setEmployeeForm({ name: '', salaryType: 'hourly', rate: '' });
                            setEmployeeMessage(t('accounts.employees.added'));
                        }}
                    />
                    {employeeMessage ? <ThemedText style={styles.muted}>{employeeMessage}</ThemedText> : null}

                    {employees.map((emp) => (
                        <View key={emp.id} style={[styles.listItem, { borderColor: palette.border }]}>
                            <ThemedText type="defaultSemiBold">{emp.name}</ThemedText>
                            <ThemedText style={styles.muted}>{emp.salary_type} · ${Number(emp.rate).toFixed(2)}</ThemedText>
                        </View>
                    ))}
                </ThemedCard>
            ) : null}

            {section === 'payroll' ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('accounts.payroll.recent')}</ThemedText>
                    <ThemedText style={styles.muted}>{t('accounts.payroll.subtitle')}</ThemedText>

                    {employees.length === 0 ? (
                        <ThemedText style={styles.muted}>{t('team.noEmployees')}</ThemedText>
                    ) : (
                        <>
                            <ThemedSelect
                                value={payrollForm.employeeId}
                                onValueChange={(val) => setPayrollForm((prev) => ({ ...prev, employeeId: val }))}
                                items={employeeOptions}
                            />
                            <ThemedInput
                                value={payrollForm.amount}
                                placeholder={t('accounts.payroll.amountPlaceholder')}
                                keyboardType="decimal-pad"
                                onChangeText={(val) => setPayrollForm((prev) => ({ ...prev, amount: val }))}
                            />
                            {methodOptions.length > 0 ? (
                                <ThemedSelect
                                    value={payrollForm.paymentMethodId}
                                    onValueChange={(val) => setPayrollForm((prev) => ({ ...prev, paymentMethodId: val }))}
                                    items={methodOptions}
                                />
                            ) : null}
                            <ThemedButton
                                label={t('accounts.payroll.add')}
                                onPress={async () => {
                                    const amount = Number(payrollForm.amount);
                                    if (!payrollForm.employeeId || !Number.isFinite(amount) || amount <= 0 || !payrollForm.paymentMethodId) {
                                        setPayrollMessage(t('accounts.payroll.invalid'));
                                        return;
                                    }
                                    const now = Math.floor(Date.now() / 1000);
                                    await addPayroll({
                                        employeeId: payrollForm.employeeId,
                                        periodStart: now,
                                        periodEnd: now,
                                        amount,
                                        paymentMethod: payrollForm.paymentMethodId as never,
                                    });
                                    setPayrollForm((prev) => ({ ...prev, amount: '' }));
                                    setPayrollMessage(t('accounts.payroll.added'));
                                }}
                            />
                            {payrollMessage ? <ThemedText style={styles.muted}>{payrollMessage}</ThemedText> : null}
                        </>
                    )}

                    {payroll.map((entry) => (
                        <View key={entry.id} style={[styles.listItem, { borderColor: palette.border }]}>
                            <ThemedText type="defaultSemiBold">{employees.find((emp) => emp.id === entry.employee_id)?.name ?? `#${entry.employee_id}`}</ThemedText>
                            <ThemedText style={styles.muted}>${Number(entry.amount).toFixed(2)}</ThemedText>
                        </View>
                    ))}
                </ThemedCard>
            ) : null}

            <UserAccountModal
                visible={accountModalVisible}
                mode="add"
                loading={authLoading}
                onClose={() => setAccountModalVisible(false)}
                onSubmit={async (payload) => {
                    const created = await createUser({
                        name: payload.name,
                        role: payload.role,
                        pin: payload.pin ?? '',
                    });
                    if (!created) return false;
                    setAccountMessage(`Cuenta creada para ${created.name} (${created.role === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}).`);
                    return true;
                }}
            />
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
    card: {
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    rowActions: {
        flexDirection: 'row',
        gap: 8,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    listItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 4,
    },
    smallButton: {
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
});
