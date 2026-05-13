import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import type { PaymentMethod } from '@/types/types';

type Section = 'expenses' | 'employees' | 'payroll' | 'caja';

function normalizeSection(value?: string | string[]): Section {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'employees' || raw === 'payroll' || raw === 'caja') {
    return raw;
  }
  return 'expenses';
}

export default function AccountsFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const section = normalizeSection(params.section);

  const { hydrate, employees, addExpense, addEmployee, addPayroll, cashRegisterToday, openCashRegister, closeCashRegister } = useAccountsStore();

  const [message, setMessage] = useState('');
  const [expenseForm, setExpenseForm] = useState({ category: 'Insumos', amount: '0', description: '', paymentMethod: 'cash' as PaymentMethod });
  const [employeeForm, setEmployeeForm] = useState({ name: '', salaryType: 'monthly' as 'hourly' | 'monthly', rate: '0' });
  const [payrollForm, setPayrollForm] = useState({ employeeId: '', amount: '0', paymentMethod: 'cash' as PaymentMethod });
  const [cajaForm, setCajaForm] = useState({ amount: '0', notes: '' });

  const selectedPayrollEmployee = useMemo(
    () => employees.find((employee) => employee.id === payrollForm.employeeId) ?? null,
    [employees, payrollForm.employeeId],
  );

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">
        {section === 'employees' ? t('accountsForm.title.employee') : section === 'payroll' ? t('accountsForm.title.payroll') : section === 'caja' ? t('accountsForm.title.caja') : t('accountsForm.title.expense')}
      </ThemedText>
      {message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      {section === 'expenses' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('accountsForm.expense.subtitle')}</ThemedText>
          <ThemedInput value={expenseForm.category} onChangeText={(value) => setExpenseForm((f) => ({ ...f, category: value }))} style={styles.input} placeholder={t('accountsForm.expense.category')} />
          <ThemedInput value={expenseForm.amount} onChangeText={(value) => setExpenseForm((f) => ({ ...f, amount: value }))} style={styles.input} keyboardType="decimal-pad" placeholder={t('accountsForm.expense.amount')} />
          <ThemedInput value={expenseForm.description} onChangeText={(value) => setExpenseForm((f) => ({ ...f, description: value }))} style={styles.input} placeholder={t('accountsForm.expense.description')} />
          <ThemedText style={styles.smallText}>{t('accountsForm.expense.paymentMethod')}</ThemedText>
          <View style={styles.row}>
            <ThemedChip style={styles.switchButton} label={t('sales.payment.cash')} active={expenseForm.paymentMethod === 'cash'} onPress={() => setExpenseForm((f) => ({ ...f, paymentMethod: 'cash' }))} />
            <ThemedChip style={styles.switchButton} label={t('sales.payment.card')} active={expenseForm.paymentMethod === 'card'} onPress={() => setExpenseForm((f) => ({ ...f, paymentMethod: 'card' }))} />
            <ThemedChip style={styles.switchButton} label={t('sales.payment.transfer')} active={expenseForm.paymentMethod === 'transfer'} onPress={() => setExpenseForm((f) => ({ ...f, paymentMethod: 'transfer' }))} />
          </View>
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label={t('accountsForm.expense.save')}
              onPress={async () => {
                await addExpense({
                  category: expenseForm.category,
                  amount: Number(expenseForm.amount || '0'),
                  description: expenseForm.description,
                  paymentMethod: expenseForm.paymentMethod,
                });
                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
          </View>
        </ThemedCard>
      ) : null}

      {section === 'employees' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('accountsForm.employee.subtitle')}</ThemedText>
          <ThemedInput value={employeeForm.name} onChangeText={(value) => setEmployeeForm((f) => ({ ...f, name: value }))} style={styles.input} placeholder={t('accountsForm.employee.name')} />
          <View style={styles.row}>
            <ThemedChip style={styles.switchButton} label={t('accountsForm.employee.hourly')} active={employeeForm.salaryType === 'hourly'} onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'hourly' }))} />
            <ThemedChip style={styles.switchButton} label={t('accountsForm.employee.monthly')} active={employeeForm.salaryType === 'monthly'} onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'monthly' }))} />
          </View>
          <ThemedInput value={employeeForm.rate} onChangeText={(value) => setEmployeeForm((f) => ({ ...f, rate: value }))} style={styles.input} keyboardType="decimal-pad" placeholder={t('accountsForm.employee.rate')} />
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label={t('accountsForm.employee.save')}
              onPress={async () => {
                if (!employeeForm.name.trim()) {
                  setMessage(t('accountsForm.employee.required'));
                  return;
                }
                await addEmployee({ name: employeeForm.name.trim(), salaryType: employeeForm.salaryType, rate: Number(employeeForm.rate || '0') });
                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
          </View>
        </ThemedCard>
      ) : null}

      {section === 'payroll' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('accountsForm.payroll.subtitle')}</ThemedText>
          <ThemedText style={styles.smallText}>{t('accountsForm.payroll.employee')}</ThemedText>
          <View style={styles.tabRow}>
            {employees.map((employee) => (
              <ThemedChip key={employee.id} style={styles.switchButton} label={employee.name} active={payrollForm.employeeId === employee.id} onPress={() => setPayrollForm((f) => ({ ...f, employeeId: employee.id }))} />
            ))}
          </View>
          {selectedPayrollEmployee ? <ThemedText style={styles.smallText}>{t('accountsForm.payroll.selected')}: {selectedPayrollEmployee.name}</ThemedText> : <ThemedText style={styles.smallText}>{t('accountsForm.payroll.selectPrompt')}</ThemedText>}
          <ThemedInput value={payrollForm.amount} onChangeText={(value) => setPayrollForm((f) => ({ ...f, amount: value }))} style={styles.input} keyboardType="decimal-pad" placeholder={t('accountsForm.payroll.amount')} />
          <ThemedText style={styles.smallText}>{t('accountsForm.expense.paymentMethod')}</ThemedText>
          <View style={styles.row}>
            <ThemedChip style={styles.switchButton} label={t('sales.payment.cash')} active={payrollForm.paymentMethod === 'cash'} onPress={() => setPayrollForm((f) => ({ ...f, paymentMethod: 'cash' }))} />
            <ThemedChip style={styles.switchButton} label={t('sales.payment.card')} active={payrollForm.paymentMethod === 'card'} onPress={() => setPayrollForm((f) => ({ ...f, paymentMethod: 'card' }))} />
            <ThemedChip style={styles.switchButton} label={t('sales.payment.transfer')} active={payrollForm.paymentMethod === 'transfer'} onPress={() => setPayrollForm((f) => ({ ...f, paymentMethod: 'transfer' }))} />
          </View>
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label={t('accountsForm.payroll.save')}
              onPress={async () => {
                if (!payrollForm.employeeId) {
                  setMessage(t('accountsForm.payroll.required'));
                  return;
                }
                const now = Math.floor(Date.now() / 1000);
                await addPayroll({
                  employeeId: payrollForm.employeeId,
                  periodStart: now,
                  periodEnd: now,
                  amount: Number(payrollForm.amount || '0'),
                  paymentMethod: payrollForm.paymentMethod,
                });
                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
          </View>
        </ThemedCard>
      ) : null}

      {section === 'caja' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('accountsForm.caja.subtitle')}</ThemedText>

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
                    await openCashRegister({ openingAmount: amount, notes: cajaForm.notes || undefined });
                    setCajaForm({ amount: '0', notes: '' });
                    setMessage('');
                  }}
                />
                <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
              </View>
            </>
          ) : cashRegisterToday.closed_at ? (
            <>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.openingAmountLabel')}: {cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.openedAt')}: {new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.closingAmountLabel')}: {cashRegisterToday.closing_amount?.toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.closedAt')}: {new Date((cashRegisterToday.closed_at) * 1000).toLocaleTimeString()}</ThemedText>
              <ThemedText style={styles.smallText}>{t('accountsForm.caja.alreadyClosed')}</ThemedText>
              <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
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
                    await closeCashRegister({ sessionId: cashRegisterToday.id, closingAmount: amount, notes: cajaForm.notes || undefined });
                    setCajaForm({ amount: '0', notes: '' });
                    setMessage('');
                  }}
                />
                <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    gap: 10,
  },
  input: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  primaryButton: {
    paddingVertical: 10,
    flex: 1,
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  switchButton: {
    borderRadius: 8,
    minWidth: 96,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
});
