import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAccountsStore } from '@/stores/accounts';

type Section = 'expenses' | 'employees' | 'payroll';

function normalizeSection(value?: string | string[]): Section {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'employees' || raw === 'payroll') {
    return raw;
  }
  return 'expenses';
}

export default function AccountsFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const section = normalizeSection(params.section);

  const { hydrate, employees, addExpense, addEmployee, addPayroll } = useAccountsStore();

  const [message, setMessage] = useState('');
  const [expenseForm, setExpenseForm] = useState({ category: 'Supplies', amount: '0', description: '' });
  const [employeeForm, setEmployeeForm] = useState({ name: '', salaryType: 'monthly' as 'hourly' | 'monthly', rate: '0' });
  const [payrollForm, setPayrollForm] = useState({ employeeId: '', amount: '0' });

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
        {section === 'employees' ? 'Add employee' : section === 'payroll' ? 'Add payroll' : 'Log expense'}
      </ThemedText>
      {message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      {section === 'expenses' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">Log expense</ThemedText>
          <ThemedInput value={expenseForm.category} onChangeText={(value) => setExpenseForm((f) => ({ ...f, category: value }))} style={styles.input} placeholder="Category" />
          <ThemedInput value={expenseForm.amount} onChangeText={(value) => setExpenseForm((f) => ({ ...f, amount: value }))} style={styles.input} keyboardType="decimal-pad" placeholder="Amount" />
          <ThemedInput value={expenseForm.description} onChangeText={(value) => setExpenseForm((f) => ({ ...f, description: value }))} style={styles.input} placeholder="Description" />
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label="Save expense"
              onPress={async () => {
                await addExpense({
                  category: expenseForm.category,
                  amount: Number(expenseForm.amount || '0'),
                  description: expenseForm.description,
                });
                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label="Back" onPress={() => router.back()} />
          </View>
        </ThemedCard>
      ) : null}

      {section === 'employees' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">Add employee</ThemedText>
          <ThemedInput value={employeeForm.name} onChangeText={(value) => setEmployeeForm((f) => ({ ...f, name: value }))} style={styles.input} placeholder="Name" />
          <View style={styles.row}>
            <ThemedChip style={styles.switchButton} label="Hourly" active={employeeForm.salaryType === 'hourly'} onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'hourly' }))} />
            <ThemedChip style={styles.switchButton} label="Monthly" active={employeeForm.salaryType === 'monthly'} onPress={() => setEmployeeForm((f) => ({ ...f, salaryType: 'monthly' }))} />
          </View>
          <ThemedInput value={employeeForm.rate} onChangeText={(value) => setEmployeeForm((f) => ({ ...f, rate: value }))} style={styles.input} keyboardType="decimal-pad" placeholder="Rate" />
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label="Save employee"
              onPress={async () => {
                if (!employeeForm.name.trim()) {
                  setMessage('Employee name is required.');
                  return;
                }
                await addEmployee({ name: employeeForm.name.trim(), salaryType: employeeForm.salaryType, rate: Number(employeeForm.rate || '0') });
                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label="Back" onPress={() => router.back()} />
          </View>
        </ThemedCard>
      ) : null}

      {section === 'payroll' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">Add payroll entry</ThemedText>
          <ThemedText style={styles.smallText}>Employee</ThemedText>
          <View style={styles.tabRow}>
            {employees.map((employee) => (
              <ThemedChip key={employee.id} style={styles.switchButton} label={employee.name} active={payrollForm.employeeId === employee.id} onPress={() => setPayrollForm((f) => ({ ...f, employeeId: employee.id }))} />
            ))}
          </View>
          {selectedPayrollEmployee ? <ThemedText style={styles.smallText}>Selected: {selectedPayrollEmployee.name}</ThemedText> : <ThemedText style={styles.smallText}>Select an employee to continue.</ThemedText>}
          <ThemedInput value={payrollForm.amount} onChangeText={(value) => setPayrollForm((f) => ({ ...f, amount: value }))} style={styles.input} keyboardType="decimal-pad" placeholder="Amount" />
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label="Save payroll"
              onPress={async () => {
                if (!payrollForm.employeeId) {
                  setMessage('Employee is required.');
                  return;
                }
                const now = Math.floor(Date.now() / 1000);
                await addPayroll({
                  employeeId: payrollForm.employeeId,
                  periodStart: now,
                  periodEnd: now,
                  amount: Number(payrollForm.amount || '0'),
                });
                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label="Back" onPress={() => router.back()} />
          </View>
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
