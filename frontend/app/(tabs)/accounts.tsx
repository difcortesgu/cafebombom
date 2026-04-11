import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';

type Section = 'expenses' | 'employees' | 'payroll';

export default function AccountsScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { hydrate, expenses, employees, payroll } = useAccountsStore();
  const [section, setSection] = useState<Section>('expenses');

  const todayExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses],
  );

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  if (currentUser?.role !== 'owner') {
    return (
      <ThemedView style={styles.denied}>
        <ThemedText type="title">{t('accounts.title')}</ThemedText>
        <ThemedText>{t('accounts.restricted')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('accounts.title')}</ThemedText>
      <ThemedText>{t('accounts.subtitle')}</ThemedText>

      <View style={styles.tabRow}>
        {(['expenses', 'employees', 'payroll'] as Section[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item === 'expenses' ? t('accounts.tab.expenses') : item === 'employees' ? t('accounts.tab.employees') : t('accounts.tab.payroll')}
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
