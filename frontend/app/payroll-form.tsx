import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

export default function PayrollFormScreen() {
    const router = useRouter();
    const palette = useAppColors();

    const { employees, addPayroll, hydrate } = useAccountsStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [form, setForm] = useState({ employeeId: '', amount: '', paymentMethodId: '' });
    const [message, setMessage] = useState('');
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

            {message ? (
                <ThemedCard style={styles.card}>
                    <ThemedText style={{ color: palette.danger }}>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
                <View style={styles.labelRow}>
                    <Ionicons name="person-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.payroll.employee')}</ThemedText>
                </View>
                {employees.length === 0 ? (
                    <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{t('team.noEmployees')}</ThemedText>
                ) : (
                    <View style={styles.chipRow}>
                        {employees.map((employee) => (
                            <Pressable
                                key={employee.id}
                                style={[
                                    styles.chip,
                                    { borderColor: palette.border },
                                    form.employeeId === employee.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                                ]}
                                onPress={() => setForm((f) => ({ ...f, employeeId: employee.id }))}
                            >
                                <ThemedText
                                    style={[
                                        styles.chipLabel,
                                        form.employeeId === employee.id && { color: palette.text },
                                    ]}
                                >
                                    {employee.name}
                                </ThemedText>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View style={styles.labelRow}>
                    <Ionicons name="cash-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('accountsForm.payroll.amount')}</ThemedText>
                </View>
                <ThemedInput
                    value={form.amount}
                    keyboardType="decimal-pad"
                    placeholder={t('accountsForm.payroll.amount')}
                    onChangeText={(val) => setForm((f) => ({ ...f, amount: val }))}
                    style={styles.input}
                />

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
                                form.paymentMethodId === method.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                            ]}
                            onPress={() => setForm((f) => ({ ...f, paymentMethodId: method.id }))}
                        >
                            <Ionicons
                                name={method.icon as any}
                                size={18}
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

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={t('accountsForm.payroll.save')}
                        onPress={async () => {
                            const amount = Number(form.amount);
                            if (!form.employeeId || !Number.isFinite(amount) || amount <= 0 || !form.paymentMethodId) {
                                setMessage(t('accountsForm.payroll.required'));
                                return;
                            }
                            const now = Math.floor(Date.now() / 1000);
                            await addPayroll({
                                employeeId: form.employeeId,
                                periodStart: now,
                                periodEnd: now,
                                amount,
                                paymentMethodId: form.paymentMethodId,
                            });
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
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderRadius: 12,
    },
    chipLabel: {
        fontSize: 12,
        fontWeight: '700',
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
