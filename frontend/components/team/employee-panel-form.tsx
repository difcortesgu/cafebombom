import { useEffect } from 'react';

import { FormFeedback } from '@/components/ui/form-feedback';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useFormPanel } from '@/hooks/use-form-panel';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import type { Employee } from '@/types/types';
import { validateForm } from '@/utils/validation';
import { employeeFormSchema } from '@/utils/validation/schemas';

type EmployeePanelFormProps = {
    visible: boolean;
    onClose: () => void;
    onExited: () => void;
    employee?: Employee;
};

type EmployeeForm = {
    name: string;
    salaryType: 'hourly' | 'monthly';
    rate: string;
};

const DEFAULT_FORM: EmployeeForm = {
    name: '',
    salaryType: 'hourly',
    rate: '',
};

export function EmployeePanelForm({ visible, onClose, onExited, employee }: EmployeePanelFormProps) {
    const { addEmployee, updateEmployee } = useAccountsStore();
    const { form, setForm, message, fieldErrors, setFieldErrors } = useFormPanel<EmployeeForm>({
        visible,
        createDefaultForm: () =>
            employee
                ? { name: employee.name, salaryType: employee.salary_type, rate: String(employee.rate) }
                : DEFAULT_FORM,
    });

    useEffect(() => {
        if (visible && employee) {
            setForm({ name: employee.name, salaryType: employee.salary_type, rate: String(employee.rate) });
        }
    }, [employee, setForm, visible]);

    const isEdit = !!employee;

    async function handleSave() {
        const result = validateForm(employeeFormSchema, form);
        if (!result.ok) {
            setFieldErrors(result.errors);
            return;
        }
        setFieldErrors({});
        const { name, salaryType, rate } = result.data;
        if (isEdit) {
            await updateEmployee({ id: employee.id, name, salaryType, rate });
        } else {
            await addEmployee({ name, salaryType, rate });
        }
        onClose();
    }

    return (
        <SlidePanel
            visible={visible}
            onClose={onClose}
            onExited={onExited}
            title={isEdit ? employee.name : t('accounts.employees.add')}
            icon="person-outline"
            footer={
                <PanelActionRow
                    primaryLabel={isEdit ? t('common.saveChanges') : t('accounts.employees.add')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={handleSave}
                    onSecondaryPress={onClose}
                />
            }
        >
            <ThemedInput
                value={form.name}
                placeholder={t('accounts.employees.namePlaceholder')}
                error={fieldErrors.name}
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
                error={fieldErrors.rate}
                onChangeText={(val) => setForm((prev) => ({ ...prev, rate: val }))}
            />
            <FormFeedback message={message} />
        </SlidePanel>
    );
}

