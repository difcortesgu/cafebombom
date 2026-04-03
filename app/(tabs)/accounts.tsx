import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { dayRangeUnix } from '@/utils/date';

type Section = 'expenses' | 'employees' | 'payroll' | 'report';

export default function AccountsScreen() {
  const palette = useAppColors();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { hydrate, expenses, employees, payroll, addExpense, addEmployee, addPayroll, getPnL } =
    useAccountsStore();
  const [section, setSection] = useState<Section>('expenses');

  const [expenseForm, setExpenseForm] = useState({ category: 'Supplies', amount: '0', description: '' });
  const [employeeForm, setEmployeeForm] = useState({ name: '', salaryType: 'monthly' as 'hourly' | 'monthly', rate: '0' });
  const [payrollForm, setPayrollForm] = useState({ employeeId: '', amount: '0' });
  const [pnl, setPnl] = useState({ income: 0, expenses: 0, net: 0 });

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  const todayExpenses = useMemo(() => {
    const { start, end } = dayRangeUnix();
    return expenses
      .filter((expense) => expense.date >= start && expense.date < end)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  }, [expenses]);

  if (currentUser?.role !== 'owner') {
    return (
      <ThemedView style={styles.denied}>
        <ThemedText type="title">Accounts</ThemedText>
        <ThemedText>This section is restricted to Owner role.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Accounts</ThemedText>
      <ThemedText>Expenses, payroll, and P&amp;L reporting.</ThemedText>

      <View style={styles.tabRow}>
        {(['expenses', 'employees', 'payroll', 'report'] as Section[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'expenses' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Log expense</ThemedText>
            <ThemedInput
              value={expenseForm.category}
              onChangeText={(value) => setExpenseForm((f) => ({ ...f, category: value }))}
              style={styles.input}
              placeholder="Category"
            />
            <ThemedInput
              value={expenseForm.amount}
              onChangeText={(value) => setExpenseForm((f) => ({ ...f, amount: value }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Amount"
            />
            <ThemedInput
              value={expenseForm.description}
              onChangeText={(value) => setExpenseForm((f) => ({ ...f, description: value }))}
              style={styles.input}
              placeholder="Description"
            />
            <ThemedButton
              style={styles.primaryButton}
              label="Save expense"
              onPress={async () => {
                await addExpense({
                  category: expenseForm.category,
                  amount: Number(expenseForm.amount || '0'),
                  description: expenseForm.description,
                });
                setExpenseForm({ category: 'Supplies', amount: '0', description: '' });
              }}
            />
            <ThemedText type="defaultSemiBold">Today expenses: ${todayExpenses.toFixed(2)}</ThemedText>
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Recent expenses</ThemedText>
            {expenses.map((expense) => (
              <View key={expense.id} style={[styles.listItem, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{expense.category}</ThemedText>
                <ThemedText>${Number(expense.amount).toFixed(2)}</ThemedText>
                <ThemedText style={styles.smallText}>{expense.description || 'No description'}</ThemedText>
              </View>
            ))}
          </ThemedCard>
        </>
      ) : null}

      {section === 'employees' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Add employee</ThemedText>
            <ThemedInput
              value={employeeForm.name}
              onChangeText={(value) => setEmployeeForm((f) => ({ ...f, name: value }))}
              style={styles.input}
              placeholder="Name"
            />
            <View style={styles.row}>
              <ThemedChip
                style={styles.switchButton}
                label="Hourly"
                active={employeeForm.salaryType === 'hourly'}
                onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'hourly' }))}
              />
              <ThemedChip
                style={styles.switchButton}
                label="Monthly"
                active={employeeForm.salaryType === 'monthly'}
                onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'monthly' }))}
              />
            </View>
            <ThemedInput
              value={employeeForm.rate}
              onChangeText={(value) => setEmployeeForm((f) => ({ ...f, rate: value }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Rate"
            />
            <ThemedButton
              style={styles.primaryButton}
              label="Save employee"
              onPress={async () => {
                if (!employeeForm.name.trim()) {
                  return;
                }
                await addEmployee({
                  name: employeeForm.name.trim(),
                  salaryType: employeeForm.salaryType,
                  rate: Number(employeeForm.rate || '0'),
                });
                setEmployeeForm({ name: '', salaryType: 'monthly', rate: '0' });
              }}
            />
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Employee roster</ThemedText>
            {employees.map((employee) => (
              <View key={employee.id} style={[styles.listItem, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{employee.name}</ThemedText>
                <ThemedText style={styles.smallText}>
                  {employee.salary_type} · ${Number(employee.rate).toFixed(2)}
                </ThemedText>
              </View>
            ))}
          </ThemedCard>
        </>
      ) : null}

      {section === 'payroll' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Add payroll entry</ThemedText>
            <ThemedInput
              value={payrollForm.employeeId}
              onChangeText={(value) => setPayrollForm((f) => ({ ...f, employeeId: value }))}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Employee ID"
            />
            <ThemedInput
              value={payrollForm.amount}
              onChangeText={(value) => setPayrollForm((f) => ({ ...f, amount: value }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Amount"
            />
            <ThemedButton
              style={styles.primaryButton}
              label="Save payroll"
              onPress={async () => {
                if (!payrollForm.employeeId) {
                  return;
                }
                const now = Math.floor(Date.now() / 1000);
                await addPayroll({
                  employeeId: Number(payrollForm.employeeId),
                  periodStart: now,
                  periodEnd: now,
                  amount: Number(payrollForm.amount || '0'),
                });
                setPayrollForm({ employeeId: '', amount: '0' });
              }}
            />
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Recent payroll</ThemedText>
            {payroll.map((entry) => (
              <View key={entry.id} style={[styles.listItem, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">Employee #{entry.employee_id}</ThemedText>
                <ThemedText>${Number(entry.amount).toFixed(2)}</ThemedText>
              </View>
            ))}
          </ThemedCard>
        </>
      ) : null}

      {section === 'report' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">P&amp;L report</ThemedText>
          <ThemedText style={styles.smallText}>Using today&apos;s range for now.</ThemedText>
          <ThemedButton
            style={styles.primaryButton}
            label="Calculate P&amp;L"
            onPress={async () => {
              const { start, end } = dayRangeUnix();
              const value = await getPnL({ startUnix: start, endUnix: end });
              setPnl(value);
            }}
          />
          <ThemedText>Income: ${pnl.income.toFixed(2)}</ThemedText>
          <ThemedText>Expenses: ${pnl.expenses.toFixed(2)}</ThemedText>
          <ThemedText type="defaultSemiBold">Net: ${pnl.net.toFixed(2)}</ThemedText>
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
  primaryButton: {
    paddingVertical: 10,
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
    gap: 2,
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
