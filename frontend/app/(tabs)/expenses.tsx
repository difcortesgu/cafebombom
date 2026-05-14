import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import type { PaymentMethod } from '@/types/types';

type Section = 'expenses' | 'payroll';

export default function ExpensesScreen() {
    const palette = useAppColors();
    const [section, setSection] = useState<Section>('expenses');

    const { hydrate, expenses, employees, payroll, addExpense, addPayroll } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [expenseForm, setExpenseForm] = useState({ category: 'Insumos', amount: '', description: '', paymentMethod: 'cash' as PaymentMethod });
    const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
    const [payrollForm, setPayrollForm] = useState({ employeeId: '', amount: '', paymentMethod: 'cash' as PaymentMethod });
    const [payrollMessage, setPayrollMessage] = useState<string | null>(null);

    const todayExpenses = useMemo(
        () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
        [expenses],
    );

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrate(), hydratePaymentMethods()]);
        }, [hydrate, hydratePaymentMethods]),
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('expenses.title')}</ThemedText>
            <ThemedText>{t('expenses.subtitle')}</ThemedText>

            <View style={styles.tabRow}>
                {(['expenses', 'payroll'] as Section[]).map((item) => (
                    <ThemedChip
                        key={item}
                        style={styles.sectionButton}
                        label={item === 'expenses' ? t('accounts.tab.expenses') : t('accounts.tab.payroll')}
                        active={section === item}
                        onPress={() => setSection(item)}
                    />
                ))}
            </View>

            {section === 'expenses' ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('accounts.expenses.recent')}</ThemedText>
                    <ThemedText type="defaultSemiBold">{t('accounts.expenses.today')}: ${todayExpenses.toFixed(2)}</ThemedText>

                    <ThemedInput
                        value={expenseForm.category}
                        placeholder={t('accountsForm.expense.category')}
                        onChangeText={(val) => setExpenseForm((prev) => ({ ...prev, category: val }))}
                    />
                    <ThemedInput
                        value={expenseForm.amount}
                        keyboardType="decimal-pad"
                        placeholder={t('accountsForm.expense.amount')}
                        onChangeText={(val) => setExpenseForm((prev) => ({ ...prev, amount: val }))}
                    />
                    <ThemedInput
                        value={expenseForm.description}
                        placeholder={t('accountsForm.expense.description')}
                        onChangeText={(val) => setExpenseForm((prev) => ({ ...prev, description: val }))}
                    />
                    <ThemedText style={styles.smallText}>{t('accountsForm.expense.paymentMethod')}</ThemedText>
                    <View style={styles.row}>
                        <ThemedChip
                            style={styles.switchButton}
                            label={t('sales.payment.cash')}
                            active={expenseForm.paymentMethod === 'cash'}
                            onPress={() => setExpenseForm((f) => ({ ...f, paymentMethod: 'cash' }))}
                        />
                        <ThemedChip
                            style={styles.switchButton}
                            label={t('sales.payment.card')}
                            active={expenseForm.paymentMethod === 'card'}
                            onPress={() => setExpenseForm((f) => ({ ...f, paymentMethod: 'card' }))}
                        />
                        <ThemedChip
                            style={styles.switchButton}
                            label={t('sales.payment.transfer')}
                            active={expenseForm.paymentMethod === 'transfer'}
                            onPress={() => setExpenseForm((f) => ({ ...f, paymentMethod: 'transfer' }))}
                        />
                    </View>
                    <ThemedButton
                        label={t('accountsForm.expense.save')}
                        onPress={async () => {
                            const amount = Number(expenseForm.amount);
                            if (!expenseForm.category.trim() || !Number.isFinite(amount) || amount <= 0) {
                                setExpenseMessage(t('accountsForm.expense.required'));
                                return;
                            }
                            await addExpense({
                                category: expenseForm.category.trim(),
                                amount,
                                description: expenseForm.description,
                                paymentMethod: expenseForm.paymentMethod,
                            });
                            setExpenseForm((prev) => ({ ...prev, amount: '', description: '' }));
                            setExpenseMessage(t('accountsForm.expense.saved'));
                        }}
                    />
                    {expenseMessage ? <ThemedText style={styles.smallText}>{expenseMessage}</ThemedText> : null}

                    {expenses.map((expense) => (
                        <View key={expense.id} style={[styles.listItem, { borderColor: palette.border }]}>
                            <ThemedText type="defaultSemiBold">{expense.category}</ThemedText>
                            <ThemedText>${Number(expense.amount).toFixed(2)}</ThemedText>
                            <ThemedText style={styles.smallText}>{expense.description || t('accounts.expenses.noDescription')}</ThemedText>
                        </View>
                    ))}
                </ThemedCard>
            ) : null}

            {section === 'payroll' ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('accounts.payroll.recent')}</ThemedText>
                    <ThemedText style={styles.smallText}>{t('accounts.payroll.subtitle')}</ThemedText>

                    {employees.length === 0 ? (
                        <ThemedText style={styles.smallText}>{t('team.noEmployees')}</ThemedText>
                    ) : (
                        <>
                            <ThemedText style={styles.smallText}>{t('accountsForm.payroll.employee')}</ThemedText>
                            <View style={styles.tabRow}>
                                {employees.map((employee) => (
                                    <ThemedChip
                                        key={employee.id}
                                        style={styles.switchButton}
                                        label={employee.name}
                                        active={payrollForm.employeeId === employee.id}
                                        onPress={() => setPayrollForm((f) => ({ ...f, employeeId: employee.id }))}
                                    />
                                ))}
                            </View>
                            <ThemedInput
                                value={payrollForm.amount}
                                keyboardType="decimal-pad"
                                placeholder={t('accountsForm.payroll.amount')}
                                onChangeText={(val) => setPayrollForm((prev) => ({ ...prev, amount: val }))}
                            />
                            <ThemedText style={styles.smallText}>{t('accountsForm.expense.paymentMethod')}</ThemedText>
                            <View style={styles.row}>
                                <ThemedChip
                                    style={styles.switchButton}
                                    label={t('sales.payment.cash')}
                                    active={payrollForm.paymentMethod === 'cash'}
                                    onPress={() => setPayrollForm((f) => ({ ...f, paymentMethod: 'cash' }))}
                                />
                                <ThemedChip
                                    style={styles.switchButton}
                                    label={t('sales.payment.card')}
                                    active={payrollForm.paymentMethod === 'card'}
                                    onPress={() => setPayrollForm((f) => ({ ...f, paymentMethod: 'card' }))}
                                />
                                <ThemedChip
                                    style={styles.switchButton}
                                    label={t('sales.payment.transfer')}
                                    active={payrollForm.paymentMethod === 'transfer'}
                                    onPress={() => setPayrollForm((f) => ({ ...f, paymentMethod: 'transfer' }))}
                                />
                            </View>
                            <ThemedButton
                                label={t('accountsForm.payroll.save')}
                                onPress={async () => {
                                    const amount = Number(payrollForm.amount);
                                    if (!payrollForm.employeeId || !Number.isFinite(amount) || amount <= 0) {
                                        setPayrollMessage(t('accountsForm.payroll.required'));
                                        return;
                                    }
                                    const now = Math.floor(Date.now() / 1000);
                                    await addPayroll({
                                        employeeId: payrollForm.employeeId,
                                        periodStart: now,
                                        periodEnd: now,
                                        amount,
                                        paymentMethod: payrollForm.paymentMethod,
                                    });
                                    setPayrollForm((prev) => ({ ...prev, amount: '' }));
                                    setPayrollMessage(t('accountsForm.payroll.saved'));
                                }}
                            />
                            {payrollMessage ? <ThemedText style={styles.smallText}>{payrollMessage}</ThemedText> : null}
                        </>
                    )}

                    {payroll.map((entry) => (
                        <View key={entry.id} style={[styles.listItem, { borderColor: palette.border }]}>
                            <ThemedText type="defaultSemiBold">{employees.find((emp) => emp.id === entry.employee_id)?.name ?? `${t('accounts.payroll.employeePrefix')} #${entry.employee_id}`}</ThemedText>
                            <ThemedText>${Number(entry.amount).toFixed(2)}</ThemedText>
                        </View>
                    ))}
                </ThemedCard>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    card: {
        gap: 10,
    },
    tabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sectionButton: {
        borderRadius: 10,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    switchButton: {
        flex: 1,
        borderRadius: 10,
    },
    smallText: {
        fontSize: 13,
        opacity: 0.9,
    },
    listItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 4,
    },
});
