import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { dayRangeUnix } from '@/utils/date';

type Section = 'expenses' | 'employees' | 'payroll' | 'report';

export default function AccountsScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { hydrate, expenses, employees, payroll, getPnL } = useAccountsStore();
  const [section, setSection] = useState<Section>('expenses');
  const [pnl, setPnl] = useState({ income: 0, expenses: 0, net: 0 });

  const todayExpenses = useMemo(() => {
    const { start, end } = dayRangeUnix();
    return expenses.filter((expense) => expense.date >= start && expense.date < end).reduce((sum, expense) => sum + Number(expense.amount), 0);
  }, [expenses]);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

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
      <ThemedText>List view with quick actions.</ThemedText>

      <View style={styles.tabRow}>
        {(['expenses', 'employees', 'payroll', 'report'] as Section[]).map((item) => (
          <ThemedChip key={item} style={styles.sectionButton} label={item} active={section === item} onPress={() => setSection(item)} />
        ))}
      </View>

      {section === 'expenses' ? (
        <ThemedCard style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">Recent expenses</ThemedText>
            <ThemedButton label="Add expense" onPress={() => router.push({ pathname: '/accounts-form', params: { section: 'expenses' } })} />
          </View>
          <ThemedText type="defaultSemiBold">Today expenses: ${todayExpenses.toFixed(2)}</ThemedText>
          {expenses.map((expense) => (
            <View key={expense.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{expense.category}</ThemedText>
              <ThemedText>${Number(expense.amount).toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{expense.description || 'No description'}</ThemedText>
            </View>
          ))}
        </ThemedCard>
      ) : null}

      {section === 'employees' ? (
        <ThemedCard style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">Employee roster</ThemedText>
            <ThemedButton label="Add employee" onPress={() => router.push({ pathname: '/accounts-form', params: { section: 'employees' } })} />
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
            <ThemedText type="subtitle">Recent payroll</ThemedText>
            <ThemedButton label="Add payroll" onPress={() => router.push({ pathname: '/accounts-form', params: { section: 'payroll' } })} />
          </View>
          {payroll.map((entry) => (
            <View key={entry.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{employees.find((employee) => employee.id === entry.employee_id)?.name ?? `Employee #${entry.employee_id}`}</ThemedText>
              <ThemedText>${Number(entry.amount).toFixed(2)}</ThemedText>
            </View>
          ))}
        </ThemedCard>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
});
