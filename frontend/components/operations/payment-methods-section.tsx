import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type PaymentMethodsSectionProps = {
    cardWidth: number;
    gap: number;
    onAdd: () => void;
};

export function PaymentMethodsSection({ cardWidth, gap, onAdd }: PaymentMethodsSectionProps) {
    const palette = useAppColors();
    const { methods, hydrateAll, toggleMethod } = usePaymentMethodsStore();

    useEffect(() => {
        void hydrateAll();
    }, [hydrateAll]);

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle">{t('settings.paymentMethods.title')}</ThemedText>
                <ThemedButton label={t('settings.paymentMethods.addButton')} onPress={onAdd} />
            </View>
            {methods.length === 0 ? (
                <ThemedText style={styles.muted}>{t('settings.paymentMethods.empty')}</ThemedText>
            ) : (
                <View style={[styles.grid, { gap }]}>
                    {methods.map((method) => (
                        <View
                            key={method.id}
                            style={[
                                styles.methodCard,
                                {
                                    width: cardWidth,
                                    borderColor: method.is_active ? palette.border : `${palette.border}66`,
                                },
                            ]}
                        >
                            <View style={[styles.methodInfo, !method.is_active && { opacity: 0.45 }]}>
                                <Ionicons
                                    name={method.icon as any}
                                    size={22}
                                    color={method.is_active ? palette.tint : palette.mutedText}
                                />
                                <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.methodName}>
                                    {method.name}
                                </ThemedText>
                            </View>
                            <ThemedButton
                                variant="secondary"
                                style={[
                                    styles.toggleButton,
                                    {
                                        borderColor: method.is_active ? palette.danger : palette.success,
                                        backgroundColor: method.is_active ? `${palette.danger}18` : `${palette.success}18`,
                                    },
                                ]}
                                labelStyle={{ color: method.is_active ? palette.danger : palette.success }}
                                label={method.is_active ? t('common.disable') : t('common.enable')}
                                onPress={() => void toggleMethod(method.id, method.is_active)}
                            />
                        </View>
                    ))}
                </View>
            )}
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    methodCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    methodInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    methodName: {
        flex: 1,
    },
    toggleButton: {
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
