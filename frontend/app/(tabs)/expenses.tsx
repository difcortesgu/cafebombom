import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type Section = 'expenses' | 'payroll';

export default function ExpensesScreen() {
    const palette = useAppColors();
    const [section, setSection] = useState<Section>('expenses');

    const { hydrate, expenses, employees, payroll, addExpense, addPayroll } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [expenseForm, setExpenseForm] = useState({ category: 'Insumos', amount: '', description: '', paymentMethodId: '' });
    const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
    const [payrollForm, setPayrollForm] = useState({ employeeId: '', amount: '', paymentMethodId: '' });
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

    useEffect(() => {
        if (methods.length === 0) {
            return;
        }

        setExpenseForm((current) => (current.paymentMethodId ? current : { ...current, paymentMethodId: methods[0]!.id }));
        setPayrollForm((current) => (current.paymentMethodId ? current : { ...current, paymentMethodId: methods[0]!.id }));
    }, [methods]);

    useEffect(() => {
        if (employees.length === 0) {
            return;
        }

        setPayrollForm((current) => (current.employeeId ? current : { ...current, employeeId: employees[0]!.id }));
    }, [employees]);

    const paymentIcon = (methodName: string) => {
        const normalized = methodName.trim().toLowerCase();
        if (normalized.includes('efect') || normalized.includes('cash')) {
            return 'banknote.fill';
        }
        if (normalized.includes('tarjeta') || normalized.includes('card')) {
            return 'creditcard.fill';
        }
        if (normalized.includes('transfer')) {
            return 'building.columns.fill';
        }
        return 'wallet.pass.fill';
    };

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <ThemedText type="title" style={styles.title}>{t('expenses.title')}</ThemedText>
                <ThemedText style={[styles.subtitle, { color: palette.mutedText }]}>{t('expenses.subtitle')}</ThemedText>
            </View>

            {/* KPI Card */}
            <View style={[styles.kpiCard, { backgroundColor: palette.tint }]}>
                <View style={styles.kpiRow}>
                    <View style={styles.kpiLeft}>
                        <ThemedText style={styles.kpiLabel}>{t('accounts.expenses.today')}</ThemedText>
                        <ThemedText style={styles.kpiAmount}>${todayExpenses.toFixed(2)}</ThemedText>
                        <ThemedText style={styles.kpiSub}>
                            {expenses.length} {expenses.length === 1 ? 'registro' : 'registros'}
                        </ThemedText>
                    </View>
                    <View style={styles.kpiIconBox}>
                        <IconSymbol name="receipt.fill" size={32} color="rgba(255,255,255,0.55)" />
                    </View>
                </View>
            </View>

            {/* Segmented Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: palette.card, borderColor: palette.border }]}>
                {(['expenses', 'payroll'] as Section[]).map((item) => (
                    <Pressable
                        key={item}
                        style={[
                            styles.tabItem,
                            section === item
                                ? { backgroundColor: palette.tint + '28' }
                                : null,
                        ]}
                        onPress={() => setSection(item)}
                    >
                        <View style={styles.tabInner}>
                            <IconSymbol
                                name={item === 'expenses' ? 'arrow.down.circle.fill' : 'person.2.fill'}
                                size={16}
                                color={section === item ? palette.tint : palette.mutedText}
                            />
                            <ThemedText
                                style={[
                                    styles.tabLabel,
                                    { color: section === item ? palette.tint : palette.mutedText },
                                ]}
                            >
                                {item === 'expenses' ? t('accounts.tab.expenses') : t('accounts.tab.payroll')}
                            </ThemedText>
                        </View>
                    </Pressable>
                ))}
            </View>

            {section === 'expenses' ? (
                <View style={styles.section}>
                    {/* Form */}
                    <View style={[styles.formCard, { backgroundColor: palette.card }]}>
                        <View style={styles.sectionHeader}>
                            <IconSymbol name="tag.fill" size={18} color={palette.tint} />
                            <ThemedText type="subtitle" style={styles.sectionTitle}>{t('accounts.expenses.recent')}</ThemedText>
                        </View>

                        <ThemedInput
                            label="Categoría"
                            value={expenseForm.category}
                            placeholder={t('accountsForm.expense.category')}
                            onChangeText={(val) => setExpenseForm((prev) => ({ ...prev, category: val }))}
                        />
                        <ThemedInput
                            label="Monto"
                            value={expenseForm.amount}
                            keyboardType="decimal-pad"
                            placeholder={t('accountsForm.expense.amount')}
                            onChangeText={(val) => setExpenseForm((prev) => ({ ...prev, amount: val }))}
                        />
                        <ThemedInput
                            label="Descripción"
                            value={expenseForm.description}
                            placeholder={t('accountsForm.expense.description')}
                            onChangeText={(val) => setExpenseForm((prev) => ({ ...prev, description: val }))}
                        />

                        <View style={styles.paymentSection}>
                            <ThemedText style={[styles.fieldLabel, { color: palette.mutedText }]}>
                                {t('accountsForm.expense.paymentMethod')}
                            </ThemedText>
                            <View style={styles.paymentRow}>
                                {methods.map((method) => (
                                    <Pressable
                                        key={method.id}
                                        style={[
                                            styles.paymentChip,
                                            { borderColor: palette.border },
                                            expenseForm.paymentMethodId === method.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                                        ]}
                                        onPress={() => setExpenseForm((f) => ({ ...f, paymentMethodId: method.id }))}
                                    >
                                        <IconSymbol
                                            name={paymentIcon(method.name)}
                                            size={18}
                                            color={expenseForm.paymentMethodId === method.id ? palette.text : palette.mutedText}
                                        />
                                        <ThemedText style={[styles.paymentChipLabel, expenseForm.paymentMethodId === method.id && { color: palette.text }]}>
                                            {method.name}
                                        </ThemedText>
                                    </Pressable>
                                ))}
                            </View>
                            {methods.length === 0 ? (
                                <ThemedText style={[styles.helperText, { color: palette.mutedText }]}>{t('settings.paymentMethods.empty')}</ThemedText>
                            ) : null}
                        </View>

                        <ThemedButton
                            label={t('accountsForm.expense.save')}
                            icon="checkmark.circle.fill"
                            style={styles.saveButton}
                            onPress={async () => {
                                const amount = Number(expenseForm.amount);
                                if (!expenseForm.category.trim() || !Number.isFinite(amount) || amount <= 0 || !expenseForm.paymentMethodId) {
                                    setExpenseMessage(t('accountsForm.expense.required'));
                                    return;
                                }
                                await addExpense({
                                    category: expenseForm.category.trim(),
                                    amount,
                                    description: expenseForm.description,
                                    paymentMethodId: expenseForm.paymentMethodId,
                                });
                                setExpenseForm((prev) => ({ ...prev, amount: '', description: '' }));
                                setExpenseMessage(t('accountsForm.expense.saved'));
                            }}
                        />
                        {expenseMessage ? (
                            <ThemedText style={[styles.message, { color: palette.success }]}>{expenseMessage}</ThemedText>
                        ) : null}
                    </View>

                    {/* Expense list */}
                    {expenses.length > 0 && (
                        <View style={styles.listSection}>
                            <View style={styles.sectionHeader}>
                                <IconSymbol name="receipt.fill" size={16} color={palette.mutedText} />
                                <ThemedText style={[styles.listSectionTitle, { color: palette.mutedText }]}>Registros del día</ThemedText>
                            </View>
                            {expenses.map((expense) => (
                                <View key={expense.id} style={[styles.listItem, { backgroundColor: palette.card }]}>
                                    <View style={[styles.listItemIcon, { backgroundColor: palette.tint + '22' }]}>
                                        <IconSymbol name="tag.fill" size={20} color={palette.tint} />
                                    </View>
                                    <View style={styles.listItemInfo}>
                                        <ThemedText type="defaultSemiBold">{expense.category}</ThemedText>
                                        <ThemedText style={[styles.listItemSub, { color: palette.mutedText }]}>
                                            {expense.description || t('accounts.expenses.noDescription')}
                                        </ThemedText>
                                    </View>
                                    <ThemedText style={[styles.listItemAmount, { color: palette.tint }]}>
                                        ${Number(expense.amount).toFixed(2)}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ) : null}

            {section === 'payroll' ? (
                <View style={styles.section}>
                    <View style={[styles.formCard, { backgroundColor: palette.card }]}>
                        <View style={styles.sectionHeader}>
                            <IconSymbol name="person.2.fill" size={18} color={palette.tint} />
                            <ThemedText type="subtitle" style={styles.sectionTitle}>{t('accounts.payroll.recent')}</ThemedText>
                        </View>
                        <ThemedText style={[styles.subtitle, { color: palette.mutedText }]}>{t('accounts.payroll.subtitle')}</ThemedText>

                        {employees.length === 0 ? (
                            <ThemedText style={{ color: palette.mutedText }}>{t('team.noEmployees')}</ThemedText>
                        ) : (
                            <>
                                <ThemedText style={[styles.fieldLabel, { color: palette.mutedText }]}>
                                    {t('accountsForm.payroll.employee')}
                                </ThemedText>
                                <View style={styles.chipRow}>
                                    {employees.map((employee) => (
                                        <ThemedChip
                                            key={employee.id}
                                            label={employee.name}
                                            active={payrollForm.employeeId === employee.id}
                                            onPress={() => setPayrollForm((f) => ({ ...f, employeeId: employee.id }))}
                                        />
                                    ))}
                                </View>
                                <ThemedInput
                                    label="Monto"
                                    value={payrollForm.amount}
                                    keyboardType="decimal-pad"
                                    placeholder={t('accountsForm.payroll.amount')}
                                    onChangeText={(val) => setPayrollForm((prev) => ({ ...prev, amount: val }))}
                                />
                                <View style={styles.paymentSection}>
                                    <ThemedText style={[styles.fieldLabel, { color: palette.mutedText }]}>
                                        {t('accountsForm.expense.paymentMethod')}
                                    </ThemedText>
                                    <View style={styles.paymentRow}>
                                        {methods.map((method) => (
                                            <Pressable
                                                key={method.id}
                                                style={[
                                                    styles.paymentChip,
                                                    { borderColor: palette.border },
                                                    payrollForm.paymentMethodId === method.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                                                ]}
                                                onPress={() => setPayrollForm((f) => ({ ...f, paymentMethodId: method.id }))}
                                            >
                                                <IconSymbol
                                                    name={paymentIcon(method.name)}
                                                    size={18}
                                                    color={payrollForm.paymentMethodId === method.id ? palette.text : palette.mutedText}
                                                />
                                                <ThemedText style={[styles.paymentChipLabel, payrollForm.paymentMethodId === method.id && { color: palette.text }]}>
                                                    {method.name}
                                                </ThemedText>
                                            </Pressable>
                                        ))}
                                    </View>
                                    {methods.length === 0 ? (
                                        <ThemedText style={[styles.helperText, { color: palette.mutedText }]}>{t('settings.paymentMethods.empty')}</ThemedText>
                                    ) : null}
                                </View>
                                <ThemedButton
                                    label={t('accountsForm.payroll.save')}
                                    icon="checkmark.circle.fill"
                                    style={styles.saveButton}
                                    onPress={async () => {
                                        const amount = Number(payrollForm.amount);
                                        if (!payrollForm.employeeId || !Number.isFinite(amount) || amount <= 0 || !payrollForm.paymentMethodId) {
                                            setPayrollMessage(t('accountsForm.payroll.required'));
                                            return;
                                        }
                                        const now = Math.floor(Date.now() / 1000);
                                        await addPayroll({
                                            employeeId: payrollForm.employeeId,
                                            periodStart: now,
                                            periodEnd: now,
                                            amount,
                                            paymentMethodId: payrollForm.paymentMethodId,
                                        });
                                        setPayrollForm((prev) => ({ ...prev, amount: '' }));
                                        setPayrollMessage(t('accountsForm.payroll.saved'));
                                    }}
                                />
                                {payrollMessage ? (
                                    <ThemedText style={[styles.message, { color: palette.success }]}>{payrollMessage}</ThemedText>
                                ) : null}
                            </>
                        )}
                    </View>

                    {payroll.length > 0 && (
                        <View style={styles.listSection}>
                            <View style={styles.sectionHeader}>
                                <IconSymbol name="receipt.fill" size={16} color={palette.mutedText} />
                                <ThemedText style={[styles.listSectionTitle, { color: palette.mutedText }]}>Registros del día</ThemedText>
                            </View>
                            {payroll.map((entry) => (
                                <View key={entry.id} style={[styles.listItem, { backgroundColor: palette.card }]}>
                                    <View style={[styles.listItemIcon, { backgroundColor: palette.accent + '22' }]}>
                                        <IconSymbol name="person.fill" size={20} color={palette.accent} />
                                    </View>
                                    <View style={styles.listItemInfo}>
                                        <ThemedText type="defaultSemiBold">
                                            {employees.find((emp) => emp.id === entry.employee_id)?.name ?? `${t('accounts.payroll.employeePrefix')} #${entry.employee_id}`}
                                        </ThemedText>
                                    </View>
                                    <ThemedText style={[styles.listItemAmount, { color: palette.accent }]}>
                                        ${Number(entry.amount).toFixed(2)}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        gap: 16,
        paddingBottom: 40,
    },
    header: {
        gap: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 14,
    },
    kpiCard: {
        borderRadius: 20,
        padding: 24,
        gap: 2,
    },
    kpiRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    kpiLeft: {
        gap: 2,
    },
    kpiIconBox: {
        padding: 4,
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.75)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    kpiAmount: {
        fontSize: 40,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 48,
    },
    kpiSub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        borderRadius: 16,
        borderWidth: 1,
        padding: 4,
        gap: 4,
    },
    tabItem: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    tabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    section: {
        gap: 12,
    },
    formCard: {
        borderRadius: 20,
        padding: 20,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    listSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    paymentSection: {
        gap: 8,
    },
    paymentRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    helperText: {
        fontSize: 13,
    },
    paymentChip: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        gap: 4,
    },
    paymentChipLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    saveButton: {
        alignSelf: 'flex-end',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginTop: 4,
    },
    message: {
        fontSize: 13,
        textAlign: 'center',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    listSection: {
        gap: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 14,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    listItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemIconText: {
        fontSize: 18,
        fontWeight: '800',
    },
    listItemInfo: {
        flex: 1,
        gap: 2,
    },
    listItemSub: {
        fontSize: 12,
    },
    listItemAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
});
