import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';

export function EmployeesTab() {
    const palette = useAppColors();
    const { employees, addEmployee } = useAccountsStore();

    const [employeeForm, setEmployeeForm] = useState({ name: '', salaryType: 'hourly' as 'hourly' | 'monthly', rate: '' });
    const [employeeMessage, setEmployeeMessage] = useState<string | null>(null);

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle">{t('accounts.employees.roster')}</ThemedText>
            </View>

            <ThemedInput
                value={employeeForm.name}
                placeholder={t('accounts.employees.namePlaceholder')}
                onChangeText={(val) => setEmployeeForm((prev) => ({ ...prev, name: val }))}
            />
            <ThemedSelect
                value={employeeForm.salaryType}
                onValueChange={(val) => setEmployeeForm((prev) => ({ ...prev, salaryType: val as 'hourly' | 'monthly' }))}
                items={[
                    { label: t('accounts.employees.hourly'), value: 'hourly' },
                    { label: t('accounts.employees.monthly'), value: 'monthly' },
                ]}
            />
            <ThemedInput
                value={employeeForm.rate}
                placeholder={t('accounts.employees.ratePlaceholder')}
                keyboardType="decimal-pad"
                onChangeText={(val) => setEmployeeForm((prev) => ({ ...prev, rate: val }))}
            />
            <ThemedButton
                label={t('accounts.employees.add')}
                onPress={async () => {
                    const rate = Number(employeeForm.rate);
                    if (!employeeForm.name.trim() || !Number.isFinite(rate) || rate <= 0) {
                        setEmployeeMessage(t('accounts.employees.invalid'));
                        return;
                    }
                    await addEmployee({ name: employeeForm.name.trim(), salaryType: employeeForm.salaryType, rate });
                    setEmployeeForm({ name: '', salaryType: 'hourly', rate: '' });
                    setEmployeeMessage(t('accounts.employees.added'));
                }}
            />
            {employeeMessage ? <ThemedText style={styles.muted}>{employeeMessage}</ThemedText> : null}

            {employees.map((emp) => (
                <View key={emp.id} style={[styles.listItem, { borderColor: palette.border }]}>
                    <ThemedText type="defaultSemiBold">{emp.name}</ThemedText>
                    <ThemedText style={styles.muted}>{emp.salary_type} · ${Number(emp.rate).toFixed(2)}</ThemedText>
                </View>
            ))}
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    listItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 4,
    },
});
