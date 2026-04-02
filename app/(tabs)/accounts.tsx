import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { dayRangeUnix } from '@/utils/date';

type Section = 'expenses' | 'employees' | 'payroll' | 'report';

export default function AccountsScreen() {
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
          <Pressable
            key={item}
            style={[styles.sectionButton, section === item && styles.sectionButtonActive]}
            onPress={() => setSection(item)}>
            <ThemedText style={section === item ? styles.sectionTextActive : undefined}>{item}</ThemedText>
          </Pressable>
        ))}
      </View>

      {section === 'expenses' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Log expense</ThemedText>
            <TextInput
              value={expenseForm.category}
              onChangeText={(value) => setExpenseForm((f) => ({ ...f, category: value }))}
              style={styles.input}
              placeholder="Category"
            />
            <TextInput
              value={expenseForm.amount}
              onChangeText={(value) => setExpenseForm((f) => ({ ...f, amount: value }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Amount"
            />
            <TextInput
              value={expenseForm.description}
              onChangeText={(value) => setExpenseForm((f) => ({ ...f, description: value }))}
              style={styles.input}
              placeholder="Description"
            />
            <Pressable
              style={styles.primaryButton}
              onPress={async () => {
                await addExpense({
                  category: expenseForm.category,
                  amount: Number(expenseForm.amount || '0'),
                  description: expenseForm.description,
                });
                setExpenseForm({ category: 'Supplies', amount: '0', description: '' });
              }}>
              <ThemedText style={styles.primaryText}>Save expense</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">Today expenses: ${todayExpenses.toFixed(2)}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Recent expenses</ThemedText>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.listItem}>
                <ThemedText type="defaultSemiBold">{expense.category}</ThemedText>
                <ThemedText>${Number(expense.amount).toFixed(2)}</ThemedText>
                <ThemedText style={styles.smallText}>{expense.description || 'No description'}</ThemedText>
              </View>
            ))}
          </ThemedView>
        </>
      ) : null}

      {section === 'employees' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Add employee</ThemedText>
            <TextInput
              value={employeeForm.name}
              onChangeText={(value) => setEmployeeForm((f) => ({ ...f, name: value }))}
              style={styles.input}
              placeholder="Name"
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.switchButton, employeeForm.salaryType === 'hourly' && styles.switchActive]}
                onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'hourly' }))}>
                <ThemedText style={employeeForm.salaryType === 'hourly' ? styles.switchActiveText : undefined}>Hourly</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.switchButton, employeeForm.salaryType === 'monthly' && styles.switchActive]}
                onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'monthly' }))}>
                <ThemedText style={employeeForm.salaryType === 'monthly' ? styles.switchActiveText : undefined}>Monthly</ThemedText>
              </Pressable>
            </View>
            <TextInput
              value={employeeForm.rate}
              onChangeText={(value) => setEmployeeForm((f) => ({ ...f, rate: value }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Rate"
            />
            <Pressable
              style={styles.primaryButton}
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
              }}>
              <ThemedText style={styles.primaryText}>Save employee</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Employee roster</ThemedText>
            {employees.map((employee) => (
              <View key={employee.id} style={styles.listItem}>
                <ThemedText type="defaultSemiBold">{employee.name}</ThemedText>
                <ThemedText style={styles.smallText}>
                  {employee.salary_type} · ${Number(employee.rate).toFixed(2)}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        </>
      ) : null}

      {section === 'payroll' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Add payroll entry</ThemedText>
            <TextInput
              value={payrollForm.employeeId}
              onChangeText={(value) => setPayrollForm((f) => ({ ...f, employeeId: value }))}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Employee ID"
            />
            <TextInput
              value={payrollForm.amount}
              onChangeText={(value) => setPayrollForm((f) => ({ ...f, amount: value }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Amount"
            />
            <Pressable
              style={styles.primaryButton}
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
              }}>
              <ThemedText style={styles.primaryText}>Save payroll</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Recent payroll</ThemedText>
            {payroll.map((entry) => (
              <View key={entry.id} style={styles.listItem}>
                <ThemedText type="defaultSemiBold">Employee #{entry.employee_id}</ThemedText>
                <ThemedText>${Number(entry.amount).toFixed(2)}</ThemedText>
              </View>
            ))}
          </ThemedView>
        </>
      ) : null}

      {section === 'report' ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">P&amp;L report</ThemedText>
          <ThemedText style={styles.smallText}>Using today&apos;s range for now.</ThemedText>
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              const { start, end } = dayRangeUnix();
              const value = await getPnL({ startUnix: start, endUnix: end });
              setPnl(value);
            }}>
            <ThemedText style={styles.primaryText}>Calculate P&amp;L</ThemedText>
          </Pressable>
          <ThemedText>Income: ${pnl.income.toFixed(2)}</ThemedText>
          <ThemedText>Expenses: ${pnl.expenses.toFixed(2)}</ThemedText>
          <ThemedText type="defaultSemiBold">Net: ${pnl.net.toFixed(2)}</ThemedText>
        </ThemedView>
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
    borderWidth: 1,
    borderColor: '#D7C8B8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionButtonActive: {
    backgroundColor: '#B64D1A',
    borderColor: '#B64D1A',
  },
  sectionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1D4C8',
    padding: 12,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8C6B2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#B64D1A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#E1D4C8',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  switchButton: {
    borderWidth: 1,
    borderColor: '#C8B7A4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  switchActive: {
    backgroundColor: '#B64D1A',
    borderColor: '#B64D1A',
  },
  switchActiveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  smallText: {
    opacity: 0.7,
    fontSize: 13,
  },
});
