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
    const { form, setForm, message, setMessage } = useFormPanel<EmployeeForm>({
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
        const rate = Number(form.rate);
        if (!form.name.trim() || !Number.isFinite(rate) || rate <= 0) {
            setMessage(t('accounts.employees.invalid'));
            return;
        }
        if (isEdit) {
            await updateEmployee({ id: employee.id, name: form.name.trim(), salaryType: form.salaryType, rate });
        } else {
            await addEmployee({ name: form.name.trim(), salaryType: form.salaryType, rate });
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
                onChangeText={(val) => setForm((prev) => ({ ...prev, rate: val }))}
            />
            <FormFeedback message={message} />
        </SlidePanel>
    );
}

