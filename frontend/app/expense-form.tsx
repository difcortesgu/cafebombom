import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip-group';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { toast } from 'sonner-native';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { validateForm } from '@/utils/validation';
import { expenseFormSchema } from '@/utils/validation/schemas';

export default function ExpenseFormScreen() {
    const router = useRouter();

    const { addExpense } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [form, setForm] = useState({ category: 'Insumos', amount: '', description: '', paymentMethodId: '' });
    const { errors, setErrors, validate } = useFieldErrors(expenseFormSchema);
    const paymentInitRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            void hydratePaymentMethods();
        }, [hydratePaymentMethods]),
    );

    useEffect(() => {
        if (paymentInitRef.current || methods.length === 0) return;
        paymentInitRef.current = true;
        setForm((f) => {
            if (f.paymentMethodId) return f;
            return { ...f, paymentMethodId: methods[0]?.id ?? '' };
        });
    }, [methods]);

    return (
        <FormScreen>
            <ThemedText type="title">{t('accounts.expenses.add')}</ThemedText>

            <ThemedCard style={styles.card}>
                <ThemedText style={styles.smallText}>{t('accountsForm.expense.category')}</ThemedText>
                <ThemedInput
                    value={form.category}
                    placeholder={t('accountsForm.expense.category')}
                    onChangeText={(val) => setForm((f) => ({ ...f, category: val }))}
                    onBlur={() => validate('category', form)}
                    error={errors.category}
                    style={styles.input}
                />

                <ThemedText style={styles.smallText}>{t('accountsForm.expense.amount')}</ThemedText>
                <ThemedInput
                    value={form.amount}
                    numeric="currency"
                    placeholder={t('accountsForm.expense.amount')}
                    onChangeText={(val) => setForm((f) => ({ ...f, amount: val }))}
                    onBlur={() => validate('amount', form)}
                    error={errors.amount}
                    style={styles.input}
                />

                <ThemedText style={styles.smallText}>{t('accountsForm.expense.description')}</ThemedText>
                <ThemedInput
                    value={form.description}
                    placeholder={t('accountsForm.expense.description')}
                    onChangeText={(val) => setForm((f) => ({ ...f, description: val }))}
                    style={styles.input}
                />

                <ThemedText style={styles.smallText}>{t('accountsForm.expense.paymentMethod')}</ThemedText>
                <ChipGroup
                    items={methods.map((m) => ({ value: m.id, label: m.name, icon: m.icon }))}
                    value={form.paymentMethodId}
                    onValueChange={(v) => { setForm((f) => ({ ...f, paymentMethodId: v })); setErrors((e) => ({ ...e, paymentMethodId: '' })); }}
                    error={errors.paymentMethodId}
                />

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={t('accountsForm.expense.save')}
                        onPress={async () => {
                            const result = validateForm(expenseFormSchema, form);
                            if (!result.ok) {
                                setErrors(result.errors);
                                return;
                            }
                            setErrors({});
                            await addExpense({
                                category: result.data.category,
                                amount: result.data.amount,
                                description: form.description,
                                paymentMethodId: form.paymentMethodId,
                            });
                            toast.success(`Gasto "${result.data.category}" registrado correctamente.`);
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
        gap: 10,
    },
    smallText: {
        fontSize: 13,
        opacity: 0.9,
    },
    input: {
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    primaryButton: {
        flex: 1,
    },
    secondaryButton: {
        flex: 1,
    },
});
