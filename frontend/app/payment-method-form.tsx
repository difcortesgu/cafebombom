import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { PAYMENT_ICONS } from '@/constants/payment-icons';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

export default function PaymentMethodFormScreen() {
    const router = useRouter();
    const palette = useAppColors();
    const { addMethod, hydrateAll } = usePaymentMethodsStore();

    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('wallet');
    const [message, setMessage] = useState('');

    useFocusEffect(
        useCallback(() => {
            void hydrateAll();
        }, [hydrateAll]),
    );

    async function submit() {
        if (!name.trim()) {
            setMessage(t('common.required'));
            return;
        }
        const id = await addMethod(name.trim(), selectedIcon);
        if (!id) {
            setMessage(t('common.error'));
            return;
        }
        await hydrateAll();
        router.back();
    }

    return (
        <FormScreen>
            <ThemedText type="title">{t('settings.paymentMethods.add')}</ThemedText>

            {message ? (
                <ThemedCard style={styles.card}>
                    <ThemedText style={{ color: palette.danger }}>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
                <View style={styles.labelRow}>
                    <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('settings.paymentMethods.name')}</ThemedText>
                </View>
                <ThemedInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('settings.paymentMethods.name')}
                />

                <View style={styles.labelRow}>
                    <Ionicons name="shapes-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>Icono</ThemedText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconGrid}>
                    {PAYMENT_ICONS.map((icon) => {
                        const selected = selectedIcon === icon.name;
                        return (
                            <Pressable
                                key={icon.name}
                                style={[
                                    styles.iconOption,
                                    { borderColor: selected ? palette.tint : palette.border },
                                    selected && { backgroundColor: `${palette.tint}22` },
                                ]}
                                onPress={() => setSelectedIcon(icon.name)}
                            >
                                <Ionicons
                                    name={icon.name as any}
                                    size={22}
                                    color={selected ? palette.tint : palette.text}
                                />
                                <ThemedText style={[styles.iconLabel, selected && { color: palette.tint }]}>
                                    {icon.label}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={t('settings.paymentMethods.addButton')}
                        onPress={() => void submit()}
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
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    smallLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    iconGrid: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    iconOption: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    iconLabel: {
        fontSize: 11,
        opacity: 0.7,
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
