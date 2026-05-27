import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { usePanelLifecycle } from '@/hooks/use-panel-lifecycle';
import { useResponsiveOpen } from '@/hooks/use-responsive-open';

import { ExpensePanel } from '@/components/expense-panel';
import { ExpensesList } from '@/components/expenses/expenses-list';
import { PayrollList } from '@/components/expenses/payroll-list';
import { PayrollPanel } from '@/components/payroll-panel';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type Section = 'expenses' | 'payroll';

export default function ExpensesScreen() {
    const palette = useAppColors();
    const { openOrNavigate } = useResponsiveOpen();
    const [section, setSection] = useState<Section>('expenses');

    const { hydrate, expenses, employees, payroll } = useAccountsStore();
    const { hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const expensePanel = usePanelLifecycle();
    const payrollPanel = usePanelLifecycle();

    const todayExpenses = useMemo(
        () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
        [expenses],
    );

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrate(), hydratePaymentMethods()]);
        }, [hydrate, hydratePaymentMethods]),
    );

    function openPayrollForm() {
        openOrNavigate(() => payrollPanel.open(), '/payroll-form');
    }

    function openExpenseForm() {
        openOrNavigate(() => expensePanel.open(), '/expense-form');
    }

    return (
        <View style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerText}>
                            <ThemedText type="title" style={styles.title}>{t('expenses.title')}</ThemedText>
                            <ThemedText style={[styles.subtitle, { color: palette.mutedText }]}>{t('expenses.subtitle')}</ThemedText>
                        </View>
                        {section === 'expenses' ? (
                            <Pressable
                                style={[styles.addButton, { backgroundColor: palette.tint }]}
                                onPress={openExpenseForm}
                                hitSlop={8}
                            >
                                <Ionicons name="add" size={22} color="#fff" />
                            </Pressable>
                        ) : null}
                        {section === 'payroll' ? (
                            <Pressable
                                style={[styles.addButton, { backgroundColor: palette.tint }]}
                                onPress={openPayrollForm}
                                hitSlop={8}
                            >
                                <Ionicons name="add" size={22} color="#fff" />
                            </Pressable>
                        ) : null}
                    </View>
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
                        <ExpensesList expenses={expenses} palette={palette} />
                    </View>
                ) : null}

                {section === 'payroll' ? (
                    <View style={styles.section}>
                        <PayrollList payroll={payroll} employees={employees} palette={palette} />
                    </View>
                ) : null}
            </ScrollView>
            {expensePanel.mounted ? (
                <ExpensePanel
                    visible={expensePanel.visible}
                    onClose={expensePanel.close}
                    onExited={() => {
                        expensePanel.onExited();
                        void hydrate();
                    }}
                />
            ) : null}
            {payrollPanel.mounted ? (
                <PayrollPanel
                    visible={payrollPanel.visible}
                    onClose={payrollPanel.close}
                    onExited={() => {
                        payrollPanel.onExited();
                        void hydrate();
                    }}
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
        padding: 20,
        gap: 16,
        paddingBottom: 40,
    },
    header: {
        gap: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    headerText: {
        flex: 1,
        gap: 4,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 14,
    },
    emptyCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
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
