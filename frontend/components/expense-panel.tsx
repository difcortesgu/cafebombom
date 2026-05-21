import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormFeedback } from '@/components/ui/form-feedback';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

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

    const [form, setForm] = useState<ExpenseForm>(DEFAULT_FORM);
    const [message, setMessage] = useState('');
    const paymentInitRef = useRef(false);
    const prevVisibleRef = useRef(false);

    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = visible;

        if (visible && !wasVisible) {
            void hydratePaymentMethods();
            paymentInitRef.current = false;
            setForm(DEFAULT_FORM);
            setMessage('');
        }
    }, [hydratePaymentMethods, visible]);

    useEffect(() => {
        if (paymentInitRef.current || methods.length === 0 || !visible) return;
        paymentInitRef.current = true;
        setForm((f) => {
            if (f.paymentMethodId) return f;
            return { ...f, paymentMethodId: methods[0]?.id ?? '' };
        });
    }, [methods, visible]);

    async function handleSave() {
        const amount = Number(form.amount);
        if (!form.category.trim() || !Number.isFinite(amount) || amount <= 0 || !form.paymentMethodId) {
            setMessage(t('accountsForm.expense.required'));
            return;
        }
        await addExpense({
            category: form.category.trim(),
            amount,
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
                    keyboardType="decimal-pad"
                    placeholder={t('accountsForm.expense.amount')}
                    onChangeText={(val) => setForm((f) => ({ ...f, amount: val }))}
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
                <View style={styles.chipRow}>
                    {methods.map((method) => (
                        <Pressable
                            key={method.id}
                            style={[
                                styles.chip,
                                { borderColor: palette.border },
                                form.paymentMethodId === method.id && {
                                    backgroundColor: palette.accent,
                                    borderColor: palette.accent,
                                },
                            ]}
                            onPress={() => setForm((f) => ({ ...f, paymentMethodId: method.id }))}
                        >
                            <Ionicons
                                name={method.icon as any}
                                size={16}
                                color={form.paymentMethodId === method.id ? palette.text : palette.mutedText}
                            />
                            <ThemedText
                                style={[
                                    styles.chipLabel,
                                    form.paymentMethodId === method.id && { color: palette.text },
                                ]}
                            >
                                {method.name}
                            </ThemedText>
                        </Pressable>
                    ))}
                </View>
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
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 8,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
    },
});
