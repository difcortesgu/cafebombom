import { useFocusEffect, useRouter } from 'expo-router';
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
import { useAuthStore } from '@/stores/auth';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type Section = 'expenses' | 'employees' | 'payroll' | 'caja';

export default function AccountsScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { hydrate, expenses, employees, payroll, cashRegisterToday, cashRegisterSummaryToday, openCashRegister, closeCashRegister } = useAccountsStore();
  const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();
  const isOwner = currentUser?.role === 'owner';
  const [section, setSection] = useState<Section>(isOwner ? 'expenses' : 'caja');
  const [message, setMessage] = useState('');
  const [cajaForm, setCajaForm] = useState({ amount: '0', notes: '' });

  const todayExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses],
  );

  useFocusEffect(
    useCallback(() => {
      void Promise.all([hydrate(), hydratePaymentMethods()]);
    }, [hydrate, hydratePaymentMethods]),
  );

  const paymentMethodNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const method of methods) {
      map.set(method.id, method.name);
    }
    map.set('cash', t('sales.payment.cash'));
    map.set('card', t('sales.payment.card'));
    map.set('transfer', t('sales.payment.transfer'));
    return map;
  }, [methods]);

  const incomeByMethod = useMemo(
    () => [...cashRegisterSummaryToday.incomeByMethod].sort((a, b) => b.total - a.total),
    [cashRegisterSummaryToday.incomeByMethod],
  );

  const expensesByMethod = useMemo(
    () => [...cashRegisterSummaryToday.expensesByMethod].sort((a, b) => b.total - a.total),
    [cashRegisterSummaryToday.expensesByMethod],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('accounts.title')}</ThemedText>
      <ThemedText>{t('accounts.subtitle')}</ThemedText>

      {section === 'caja' && message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <View style={styles.tabRow}>
        {(isOwner ? (['expenses', 'employees', 'payroll', 'caja'] as Section[]) : (['caja'] as Section[])).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item === 'expenses' ? t('accounts.tab.expenses') : item === 'employees' ? t('accounts.tab.employees') : item === 'payroll' ? t('accounts.tab.payroll') : t('accounts.tab.caja')}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'expenses' ? (
        <ThemedCard style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">{t('accounts.expenses.recent')}</ThemedText>
            <ThemedButton label={t('accounts.expenses.add')} onPress={() => router.push({ pathname: '/accounts-form', params: { section: 'expenses' } })} />
          </View>
          <ThemedText type="defaultSemiBold">{t('accounts.expenses.today')}: ${todayExpenses.toFixed(2)}</ThemedText>
          {expenses.map((expense) => (
            <View key={expense.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{expense.category}</ThemedText>
              <ThemedText>${Number(expense.amount).toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{expense.description || t('accounts.expenses.noDescription')}</ThemedText>
            </View>
          ))}
        </ThemedCard>
      ) : null}

      {section === 'employees' ? (
        <ThemedCard style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">{t('accounts.employees.roster')}</ThemedText>
            <ThemedButton label={t('accounts.employees.add')} onPress={() => router.push({ pathname: '/accounts-form', params: { section: 'employees' } })} />
          </View>
          {employees.map((employee) => (
            <View key={employee.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{employee.name}</ThemedText>
              <ThemedText style={styles.smallText}>{employee.salary_type} · ${Number(employee.rate).toFixed(2)}</ThemedText>
            </View>
          ))}
        </ThemedCard>
      ) : null}

      {section === 'payroll' ? (
        <ThemedCard style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">{t('accounts.payroll.recent')}</ThemedText>
            <ThemedButton label={t('accounts.payroll.add')} onPress={() => router.push({ pathname: '/accounts-form', params: { section: 'payroll' } })} />
          </View>
          <ThemedText style={styles.smallText}>{t('accounts.payroll.subtitle')}</ThemedText>
          {payroll.map((entry) => (
            <View key={entry.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{employees.find((employee) => employee.id === entry.employee_id)?.name ?? `${t('accounts.payroll.employeePrefix')} #${entry.employee_id}`}</ThemedText>
              <ThemedText>${Number(entry.amount).toFixed(2)}</ThemedText>
            </View>
          ))}
        </ThemedCard>
      ) : null}

      {section === 'caja' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('accountsForm.caja.subtitle')}</ThemedText>

          <ThemedText type="defaultSemiBold">{t('accountsForm.caja.dailySummaryTitle')}</ThemedText>
          <ThemedText style={styles.smallText}>{t('accountsForm.caja.dailyIncomeLabel')}: ${cashRegisterSummaryToday.incomeTotal.toFixed(2)}</ThemedText>
          <ThemedText style={styles.smallText}>{t('accountsForm.caja.dailyExpensesLabel')}: ${cashRegisterSummaryToday.expensesTotal.toFixed(2)}</ThemedText>
          <ThemedText style={styles.smallText}>{t('accountsForm.caja.dailyNetLabel')}: ${cashRegisterSummaryToday.net.toFixed(2)}</ThemedText>

          <ThemedText type="defaultSemiBold">{t('accountsForm.caja.incomeByMethodTitle')}</ThemedText>
          {incomeByMethod.length === 0 ? (
            <ThemedText style={styles.smallText}>{t('accountsForm.caja.noIncomeToday')}</ThemedText>
          ) : (
            incomeByMethod.map((row) => (
              <View key={`income-${row.payment_method_id}`} style={[styles.listItem, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{paymentMethodNameById.get(row.payment_method_id) ?? row.payment_method_id}</ThemedText>
                <ThemedText>${row.total.toFixed(2)}</ThemedText>
              </View>
            ))
          )}

          <ThemedText type="defaultSemiBold">{t('accountsForm.caja.expensesByMethodTitle')}</ThemedText>
          {expensesByMethod.length === 0 ? (
            <ThemedText style={styles.smallText}>{t('accountsForm.caja.noExpensesToday')}</ThemedText>
          ) : (
            expensesByMethod.map((row) => (
              <View key={`expense-${row.payment_method_id}`} style={[styles.listItem, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{paymentMethodNameById.get(row.payment_method_id) ?? row.payment_method_id}</ThemedText>
                <ThemedText>${row.total.toFixed(2)}</ThemedText>
              </View>
            ))
          )}

          {!cashRegisterToday ? (
            <>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.noSession')}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.openTitle')}</ThemedText>
              <ThemedInput
                value={cajaForm.amount}
                onChangeText={(value) => setCajaForm((f) => ({ ...f, amount: value }))}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={t('accountsForm.caja.openingAmount')}
              />
              <ThemedInput
                value={cajaForm.notes}
                onChangeText={(value) => setCajaForm((f) => ({ ...f, notes: value }))}
                style={styles.input}
                placeholder={t('accountsForm.caja.notes')}
              />
              <View style={styles.actionsRow}>
                <ThemedButton
                  style={styles.primaryButton}
                  label={t('accountsForm.caja.open')}
                  onPress={async () => {
                    const amount = Number(cajaForm.amount || '0');
                    if (amount < 0) {
                      setMessage(t('accountsForm.caja.openAmountRequired'));
                      return;
                    }
                    try {
                      await openCashRegister({ openingAmount: amount, notes: cajaForm.notes || undefined });
                      setCajaForm({ amount: '0', notes: '' });
                      setMessage('');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : t('common.error'));
                    }
                  }}
                />
              </View>
            </>
          ) : cashRegisterToday.closed_at ? (
            <>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.openingAmountLabel')}: {cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.openedAt')}: {new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.closingAmountLabel')}: {cashRegisterToday.closing_amount?.toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.closedAt')}: {new Date((cashRegisterToday.closed_at) * 1000).toLocaleTimeString()}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.alreadyClosed')}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.reopenTitle')}</ThemedText>
              <ThemedInput
                value={cajaForm.amount}
                onChangeText={(value) => setCajaForm((f) => ({ ...f, amount: value }))}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={t('accountsForm.caja.openingAmount')}
              />
              <ThemedInput
                value={cajaForm.notes}
                onChangeText={(value) => setCajaForm((f) => ({ ...f, notes: value }))}
                style={styles.input}
                placeholder={t('accountsForm.caja.notes')}
              />
              <View style={styles.actionsRow}>
                <ThemedButton
                  style={styles.primaryButton}
                  label={t('accountsForm.caja.reopen')}
                  onPress={async () => {
                    const amount = Number(cajaForm.amount || '0');
                    if (amount < 0) {
                      setMessage(t('accountsForm.caja.openAmountRequired'));
                      return;
                    }
                    try {
                      await openCashRegister({ openingAmount: amount, notes: cajaForm.notes || undefined });
                      setCajaForm((prev) => ({ ...prev, notes: '' }));
                      setMessage('');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : t('common.error'));
                    }
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.openingAmountLabel')}: {cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.openedAt')}: {new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.closeTitle')}</ThemedText>
              <ThemedInput
                value={cajaForm.amount}
                onChangeText={(value) => setCajaForm((f) => ({ ...f, amount: value }))}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={t('accountsForm.caja.closingAmount')}
              />
              <ThemedInput
                value={cajaForm.notes}
                onChangeText={(value) => setCajaForm((f) => ({ ...f, notes: value }))}
                style={styles.input}
                placeholder={t('accountsForm.caja.notes')}
              />
              <View style={styles.actionsRow}>
                <ThemedButton
                  style={styles.primaryButton}
                  label={t('accountsForm.caja.close')}
                  onPress={async () => {
                    const amount = Number(cajaForm.amount || '0');
                    if (amount < 0) {
                      setMessage(t('accountsForm.caja.closeAmountRequired'));
                      return;
                    }
                    try {
                      await closeCashRegister({ sessionId: cashRegisterToday.id, closingAmount: amount, notes: cajaForm.notes || undefined });
                      setCajaForm({ amount: '0', notes: '' });
                      setMessage('');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : t('common.error'));
                    }
                  }}
                />
              </View>
            </>
          )}
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
  denied: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
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
  card: {
    gap: 10,
  },
  input: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 10,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
});
