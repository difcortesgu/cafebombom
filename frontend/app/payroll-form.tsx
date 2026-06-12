import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip-group';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { toast } from 'sonner-native';
import { validateField, validateForm } from '@/utils/validation';
import { payrollFormSchema } from '@/utils/validation/schemas';

export default function PayrollFormScreen() {
    const router = useRouter();
    const palette = useAppColors();

    const { employees, addPayroll, hydrate } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [form, setForm] = useState({ employeeId: '', amount: '', paymentMethodId: '' });
    const [amountError, setAmountError] = useState('');
    const [chipErrors, setChipErrors] = useState({ employeeId: '', paymentMethodId: '' });
    const paymentInitRef = useRef(false);
    const employeeInitRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrate(), hydratePaymentMethods()]);
        }, [hydrate, hydratePaymentMethods]),
    );

    useEffect(() => {
        if (paymentInitRef.current || methods.length === 0) return;
        paymentInitRef.current = true;
        setForm((f) => {
            if (f.paymentMethodId) return f;
            return { ...f, paymentMethodId: methods[0]?.id ?? '' };
        });
    }, [methods]);

    useEffect(() => {
        if (employeeInitRef.current || employees.length === 0) return;
        employeeInitRef.current = true;
        setForm((f) => {
            if (f.employeeId) return f;
            return { ...f, employeeId: employees[0]?.id ?? '' };
        });
    }, [employees]);

    return (
        <FormScreen>
            <ThemedText type="title">{t('accounts.payroll.add')}</ThemedText>

            <ThemedCard style={styles.card}>
                <ThemedText style={styles.smallText}>{t('accountsForm.payroll.employee')}</ThemedText>
                {employees.length === 0 ? (
                    <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{t('team.noEmployees')}</ThemedText>
                ) : (
                    <ChipGroup
                        items={employees.map((e) => ({ value: e.id, label: e.name }))}
                        value={form.employeeId}
                        onValueChange={(v) => { setForm((f) => ({ ...f, employeeId: v })); setChipErrors((e) => ({ ...e, employeeId: '' })); }}
                        error={chipErrors.employeeId}
                    />
                )}

                <View style={styles.labelRow}>
                    <Ionicons name="cash-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.payroll.amount')}</ThemedText>
                </View>
                <ThemedInput
                    value={form.amount}
                    numeric="currency"
                    placeholder={t('accountsForm.payroll.amount')}
                    onChangeText={(val) => setForm((f) => ({ ...f, amount: val }))}
                    onBlur={() => setAmountError(validateField(payrollFormSchema, form, 'amount') ?? '')}
                    error={amountError}
                    style={styles.input}
                />

                <ThemedText style={styles.smallText}>{t('accountsForm.expense.paymentMethod')}</ThemedText>
                <ChipGroup
                    items={methods.map((m) => ({ value: m.id, label: m.name, icon: m.icon }))}
                    value={form.paymentMethodId}
                    onValueChange={(v) => { setForm((f) => ({ ...f, paymentMethodId: v })); setChipErrors((e) => ({ ...e, paymentMethodId: '' })); }}
                    error={chipErrors.paymentMethodId}
                />

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={t('accountsForm.payroll.save')}
                        onPress={async () => {
                            const result = validateForm(payrollFormSchema, form);
                            if (!result.ok) {
                                setAmountError(result.errors.amount ?? '');
                                setChipErrors({
                                    employeeId: result.errors.employeeId ? t('accountsForm.payroll.required') : '',
                                    paymentMethodId: result.errors.paymentMethodId ? t('accountsForm.payroll.required') : '',
                                });
                                return;
                            }
                            setAmountError('');
                            setChipErrors({ employeeId: '', paymentMethodId: '' });
                            const now = Math.floor(Date.now() / 1000);
                            await addPayroll({
                                employeeId: form.employeeId,
                                periodStart: now,
                                periodEnd: now,
                                amount: result.data.amount,
                                paymentMethodId: form.paymentMethodId,
                            });
                            toast.success(t('toast.payrollAdded'));
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
