import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormFeedback } from '@/components/ui/form-feedback';
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
import { expenseFormSchema } from '@/utils/validation/schemas';

type ExpensePanelProps = {
    visible: boolean;
    onClose: () => void;
    onExited: () => void;
};

type ExpenseForm = {
    category: string;
    amount: string;
    description: string;
    paymentMethodId: string;
};

const DEFAULT_FORM: ExpenseForm = {
    category: 'Insumos',
    amount: '',
    description: '',
    paymentMethodId: '',
};

export function ExpensePanel({ visible, onClose, onExited }: ExpensePanelProps) {
    const palette = useAppColors();

    const { addExpense } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const paymentInitRef = useRef(false);
    const { form, setForm, message, setMessage, fieldErrors, setFieldErrors } = useFormPanel<ExpenseForm>({
        visible,
        createDefaultForm: () => DEFAULT_FORM,
        onOpen: () => {
            paymentInitRef.current = false;
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

    async function handleSave() {
        const result = validateForm(expenseFormSchema, form);
        if (!result.ok) {
            setFieldErrors(result.errors);
            if (result.errors.paymentMethodId) setMessage(t('accountsForm.expense.required'));
            return;
        }
        setFieldErrors({});
        setMessage('');
        await addExpense({
            category: result.data.category,
            amount: result.data.amount,
            description: form.description,
            paymentMethodId: form.paymentMethodId,
        });
        onClose();
    }

    return (
        <SlidePanel
            visible={visible}
            title={t('accounts.expenses.add')}
            icon="arrow-down-circle-outline"
            onClose={onClose}
            onExited={onExited}
            footer={(
                <PanelActionRow
                    primaryLabel={t('accountsForm.expense.save')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={handleSave}
                    onSecondaryPress={onClose}
                    primaryButtonStyle={styles.saveButton}
                />
            )}
        >
            <FormFeedback message={message} />

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="pricetag-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.expense.category')}</ThemedText>
                </View>
                <ThemedInput
                    value={form.category}
                    placeholder={t('accountsForm.expense.category')}
                    onChangeText={(val) => setForm((f) => ({ ...f, category: val }))}
                    error={fieldErrors.category}
                    style={styles.input}
                />
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="cash-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.expense.amount')}</ThemedText>
                </View>
                <ThemedInput
                    value={form.amount}
                    numeric="currency"
                    placeholder={t('accountsForm.expense.amount')}
                    onChangeText={(val) => setForm((f) => ({ ...f, amount: val }))}
                    error={fieldErrors.amount}
                    style={styles.input}
                />
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="document-text-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.expense.description')}</ThemedText>
                </View>
                <ThemedInput
                    value={form.description}
                    placeholder={t('accountsForm.expense.description')}
                    onChangeText={(val) => setForm((f) => ({ ...f, description: val }))}
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
                    onSelect={(id) => setForm((f) => ({ ...f, paymentMethodId: id }))}
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
