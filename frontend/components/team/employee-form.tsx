import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { t } from '@/i18n';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useAccountsStore } from '@/stores/accounts';
import type { Employee } from '@/types/types';
import { validateForm } from '@/utils/validation';
import { employeeFormSchema } from '@/utils/validation/schemas';

export type EmployeeFormProps = {
    employee?: Employee;
    onClose: () => void;
};

export function EmployeeForm({ employee, onClose }: EmployeeFormProps) {
    const { addEmployee, updateEmployee } = useAccountsStore();

    const isEditing = employee !== undefined;

    const [form, setForm] = useState({
        name: employee?.name ?? '',
        salaryType: (employee?.salary_type ?? 'hourly') as 'hourly' | 'monthly',
        rate: employee ? String(employee.rate) : '',
    });
    const { errors, setErrors, validate } = useFieldErrors(employeeFormSchema);

    async function handleSave() {
        const result = validateForm(employeeFormSchema, form);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setErrors({});
        const { name, salaryType, rate } = result.data;
        if (isEditing && employee) {
            await updateEmployee({ id: employee.id, name, salaryType, rate });
            toast.success(`Empleado "${name}" actualizado correctamente.`);
        } else {
            await addEmployee({ name, salaryType, rate });
            toast.success(`Empleado "${name}" agregado correctamente.`);
        }
        onClose();
    }

    return (
        <>
            <ThemedInput
                value={form.name}
                placeholder={t('accounts.employees.namePlaceholder')}
                error={errors.name}
                onBlur={() => validate('name', form)}
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
                numeric="currency"
                error={errors.rate}
                onBlur={() => validate('rate', form)}
                onChangeText={(val) => setForm((prev) => ({ ...prev, rate: val }))}
            />
            <View style={styles.actionsRow}>
                <PanelActionRow
                    primaryLabel={isEditing ? t('common.saveChanges') : t('accounts.employees.add')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={() => void handleSave()}
                    onSecondaryPress={onClose}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        marginTop: 4,
    },
});
