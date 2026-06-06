import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { validateForm } from '@/utils/validation';
import { employeeFormSchema } from '@/utils/validation/schemas';

export default function EmployeeFormScreen() {
    const router = useRouter();
    const palette = useAppColors();
    const params = useLocalSearchParams<{ id?: string }>();

    const { addEmployee, updateEmployee, employees, hydrate } = useAccountsStore();

    const editingEmployee = params.id ? employees.find((e) => e.id === params.id) : undefined;
    const isEditing = editingEmployee !== undefined;

    const [form, setForm] = useState({
        name: editingEmployee?.name ?? '',
        salaryType: (editingEmployee?.salary_type ?? 'hourly') as 'hourly' | 'monthly',
        rate: editingEmployee ? String(editingEmployee.rate) : '',
    });
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useFocusEffect(
        useCallback(() => {
            void hydrate();
        }, [hydrate]),
    );

    useEffect(() => {
        if (!editingEmployee) return;
        setForm({
            name: editingEmployee.name,
            salaryType: editingEmployee.salary_type,
            rate: String(editingEmployee.rate),
        });
        setMessage('');
    }, [editingEmployee]);

    return (
        <FormScreen>
            <ThemedText type="title">
                {isEditing ? t('accounts.employees.edit') : t('accounts.employees.add')}
            </ThemedText>

            {message ? (
                <ThemedCard style={styles.card}>
                    <ThemedText style={{ color: palette.danger }}>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
                <ThemedInput
                    value={form.name}
                    placeholder={t('accounts.employees.namePlaceholder')}
                    error={errors.name}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, name: val }))}
                />
                <ThemedSelect
                    value={form.salaryType}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, salaryType: val as 'hourly' | 'monthly' }))}
                    items={[
                        { label: t('accounts.employees.hourly'), value: 'hourly' },
                        { label: t('accounts.employees.monthly'), value: 'monthly' },
                    ]}
                />
                <ThemedInput
                    value={form.rate}
                    placeholder={t('accounts.employees.ratePlaceholder')}
                    keyboardType="decimal-pad"
                    error={errors.rate}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, rate: val }))}
                />

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={isEditing ? t('accounts.employees.save') : t('accounts.employees.add')}
                        onPress={async () => {
                            const result = validateForm(employeeFormSchema, form);
                            if (!result.ok) {
                                setErrors(result.errors);
                                return;
                            }
                            setErrors({});
                            const { name, salaryType, rate } = result.data;
                            if (isEditing && editingEmployee) {
                                await updateEmployee({ id: editingEmployee.id, name, salaryType, rate });
                            } else {
                                await addEmployee({ name, salaryType, rate });
                            }
                            router.back();
                        }}
                    />
                    <ThemedButton
                        variant="secondary"
                        style={styles.secondaryButton}
                        icon="arrow-back"
                        label={t('common.back')}
                        onPress={() => router.back()}
                    />
                </View>
            </ThemedCard>
        </FormScreen>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    primaryButton: {
        flex: 1,
    },
    secondaryButton: {
        flex: 1,
    },
});
