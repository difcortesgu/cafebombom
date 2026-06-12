import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip-group';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { PaymentMethodChipSelector } from '@/components/ui/payment-method-chip-selector';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ThemedInput } from '@/components/ui/themed-input';
import { useFormPanel } from '@/hooks/use-form-panel';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { validateForm } from '@/utils/validation';
import { payrollFormSchema } from '@/utils/validation/schemas';

type PayrollPanelProps = {
    visible: boolean;
    onClose: () => void;
    onExited: () => void;
};

type PayrollForm = {
    employeeId: string;
    amount: string;
    paymentMethodId: string;
};

const DEFAULT_FORM: PayrollForm = {
    employeeId: '',
    amount: '',
    paymentMethodId: '',
};

export function PayrollPanel({ visible, onClose, onExited }: PayrollPanelProps) {
    const palette = useAppColors();

    const { employees, addPayroll } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const paymentInitRef = useRef(false);
    const employeeInitRef = useRef(false);
    const { form, setForm, fieldErrors, setFieldErrors } = useFormPanel<PayrollForm>({
        visible,
        createDefaultForm: () => DEFAULT_FORM,
        onOpen: () => {
            paymentInitRef.current = false;
            employeeInitRef.current = false;
            void hydratePaymentMethods();
        },
    });

    useEffect(() => {
        if (paymentInitRef.current || methods.length === 0 || !visible) return;
        paymentInitRef.current = true;
        setForm((f) => {
            if (f.paymentMethodId) return f;
            return { ...f, paymentMethodId: methods[0]?.id ?? '' };
        });
    }, [methods, setForm, visible]);

    useEffect(() => {
        if (employeeInitRef.current || employees.length === 0 || !visible) return;
        employeeInitRef.current = true;
        setForm((f) => {
            if (f.employeeId) return f;
            return { ...f, employeeId: employees[0]?.id ?? '' };
        });
    }, [employees, setForm, visible]);

    async function handleSave() {
        const result = validateForm(payrollFormSchema, form);
        if (!result.ok) {
            setFieldErrors(result.errors);
            return;
        }
        setFieldErrors({});
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date();
        dayEnd.setHours(23, 59, 59, 0);
        await addPayroll({
            employeeId: form.employeeId,
            periodStart: Math.floor(dayStart.getTime() / 1000),
            periodEnd: Math.floor(dayEnd.getTime() / 1000),
            amount: result.data.amount,
            paymentMethodId: form.paymentMethodId,
        });
        onClose();
    }

    return (
        <SlidePanel
            visible={visible}
            title={t('accounts.payroll.add')}
            icon="people-outline"
            onClose={onClose}
            onExited={onExited}
            footer={(
                <PanelActionRow
                    primaryLabel={t('accountsForm.payroll.save')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={handleSave}
                    onSecondaryPress={onClose}
                    primaryButtonStyle={styles.saveButton}
                />
            )}
        >
            <View style={styles.fieldGroup}>
                <ThemedText style={styles.smallText}>{t('accountsForm.payroll.employee')}</ThemedText>
                {employees.length === 0 ? (
                    <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{t('team.noEmployees')}</ThemedText>
                ) : (
                    <ChipGroup
                        items={employees.map((e) => ({ value: e.id, label: e.name }))}
                        value={form.employeeId}
                        onValueChange={(v) => { setForm((f) => ({ ...f, employeeId: v })); setFieldErrors((e) => ({ ...e, employeeId: '' })); }}
                        error={fieldErrors.employeeId}
                    />
                )}
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="cash-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.payroll.amount')}</ThemedText>
                </View>
                <ThemedInput
                    value={form.amount}
                    numeric="currency"
                    placeholder={t('accountsForm.payroll.amount')}
                    onChangeText={(val) => setForm((f) => ({ ...f, amount: val }))}
                    error={fieldErrors.amount}
                    style={styles.input}
                />
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="card-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.expense.paymentMethod')}</ThemedText>
                </View>
                <PaymentMethodChipSelector
                    methods={methods}
                    selectedId={form.paymentMethodId}
                    onSelect={(id) => { setForm((f) => ({ ...f, paymentMethodId: id })); setFieldErrors((e) => ({ ...e, paymentMethodId: '' })); }}
                    error={fieldErrors.paymentMethodId}
                />
            </View>
        </SlidePanel>
    );
}

const styles = StyleSheet.create({
    fieldGroup: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    smallText: {
        fontSize: 13,
        opacity: 0.9,
    },
    input: {
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    saveButton: {
        flex: 1,
    },
});
