import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';

export default function EmployeeFormScreen() {
    const router = useRouter();
    const palette = useAppColors();

    const { addEmployee, hydrate } = useAccountsStore();

    const [form, setForm] = useState({ name: '', salaryType: 'hourly' as 'hourly' | 'monthly', rate: '' });
    const [message, setMessage] = useState('');

    useFocusEffect(
        useCallback(() => {
            void hydrate();
        }, [hydrate]),
    );

    return (
        <FormScreen>
            <ThemedText type="title">{t('accounts.employees.add')}</ThemedText>

            {message ? (
                <ThemedCard style={styles.card}>
                    <ThemedText style={{ color: palette.danger }}>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
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

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={t('accounts.employees.add')}
                        onPress={async () => {
                            const rate = Number(form.rate);
                            if (!form.name.trim() || !Number.isFinite(rate) || rate <= 0) {
                                setMessage(t('accounts.employees.invalid'));
                                return;
                            }
                            await addEmployee({ name: form.name.trim(), salaryType: form.salaryType, rate });
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
        gap: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    primaryButton: {
        flex: 1,
    },
    secondaryButton: {
        flex: 1,
    },
});
