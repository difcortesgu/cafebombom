import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

export function PayrollTab() {
    const palette = useAppColors();
    const { employees, payroll, addPayroll } = useAccountsStore();
    const { methods } = usePaymentMethodsStore();

    const [payrollForm, setPayrollForm] = useState({ employeeId: '', amount: '', paymentMethodId: '' });
    const [payrollMessage, setPayrollMessage] = useState<string | null>(null);

    const employeeOptions = useMemo(
        () => employees.map((emp) => ({ label: emp.name, value: emp.id })),
        [employees],
    );

    const methodOptions = useMemo(
        () => methods.map((m) => ({ label: m.name, value: m.id })),
        [methods],
    );

    useEffect(() => {
        if (employeeOptions.length > 0 && !payrollForm.employeeId) {
            setPayrollForm((prev) => ({ ...prev, employeeId: employeeOptions[0].value }));
        }
    }, [employeeOptions, payrollForm.employeeId]);

    useEffect(() => {
        if (methodOptions.length > 0 && !payrollForm.paymentMethodId) {
            setPayrollForm((prev) => ({ ...prev, paymentMethodId: methodOptions[0].value }));
        }
    }, [methodOptions, payrollForm.paymentMethodId]);

    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('accounts.payroll.recent')}</ThemedText>
            <ThemedText style={styles.muted}>{t('accounts.payroll.subtitle')}</ThemedText>

            {employees.length === 0 ? (
                <ThemedText style={styles.muted}>{t('team.noEmployees')}</ThemedText>
            ) : (
                <>
                    <ThemedSelect
                        value={payrollForm.employeeId}
                        onValueChange={(val) => setPayrollForm((prev) => ({ ...prev, employeeId: val }))}
                        items={employeeOptions}
                    />
                    <ThemedInput
                        value={payrollForm.amount}
                        placeholder={t('accounts.payroll.amountPlaceholder')}
                        keyboardType="decimal-pad"
                        onChangeText={(val) => setPayrollForm((prev) => ({ ...prev, amount: val }))}
                    />
                    {methodOptions.length > 0 ? (
                        <ThemedSelect
                            value={payrollForm.paymentMethodId}
                            onValueChange={(val) => setPayrollForm((prev) => ({ ...prev, paymentMethodId: val }))}
                            items={methodOptions}
                        />
                    ) : null}
                    <ThemedButton
                        label={t('accounts.payroll.add')}
                        onPress={async () => {
                            const amount = Number(payrollForm.amount);
                            if (!payrollForm.employeeId || !Number.isFinite(amount) || amount <= 0 || !payrollForm.paymentMethodId) {
                                setPayrollMessage(t('accounts.payroll.invalid'));
                                return;
                            }
                            const now = Math.floor(Date.now() / 1000);
                            await addPayroll({
                                employeeId: payrollForm.employeeId,
                                periodStart: now,
                                periodEnd: now,
                                amount,
                                paymentMethodId: payrollForm.paymentMethodId,
                            });
                            setPayrollForm((prev) => ({ ...prev, amount: '' }));
                            setPayrollMessage(t('accounts.payroll.added'));
                        }}
                    />
                    {payrollMessage ? <ThemedText style={styles.muted}>{payrollMessage}</ThemedText> : null}
                </>
            )}

            {payroll.map((entry) => (
                <View key={entry.id} style={[styles.listItem, { borderColor: palette.border }]}>
                    <ThemedText type="defaultSemiBold">{employees.find((emp) => emp.id === entry.employee_id)?.name ?? `#${entry.employee_id}`}</ThemedText>
                    <ThemedText style={styles.muted}>${Number(entry.amount).toFixed(2)}</ThemedText>
                </View>
            ))}
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    listItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 4,
    },
});
