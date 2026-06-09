import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type PaymentMethodsSectionProps = {
    gap: number;
    onAdd: () => void;
    onEdit: (method: { id: string; name: string; icon: string; is_active: boolean }) => void;
};

export function PaymentMethodsSection({ gap, onAdd, onEdit }: PaymentMethodsSectionProps) {
    const palette = useAppColors();
    const { onLayout, cardWidth } = useMeasuredGrid(gap);
    const { methods, hydrateAll, toggleMethod, deleteMethod } = usePaymentMethodsStore();

    useEffect(() => {
        void hydrateAll();
    }, [hydrateAll]);

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle" style={styles.headerTitle}>{t('settings.paymentMethods.title')}</ThemedText>
                <ThemedButton icon="add-circle-outline" size="sm" label={t('settings.paymentMethods.addButton')} onPress={onAdd} />
            </View>
            {methods.length === 0 ? (
                <ThemedText style={styles.muted}>{t('settings.paymentMethods.empty')}</ThemedText>
            ) : (
                <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                    {methods.map((method) => (
                        <EntityCard
                            key={method.id}
                            width={cardWidth}
                            title={method.name}
                            style={{ borderColor: method.is_active ? palette.border : `${palette.border}66`, opacity: method.is_active ? 1 : 0.6 }}
                            titleLeading={(
                                <Ionicons
                                    name={method.icon as any}
                                    size={22}
                                    color={method.is_active ? palette.tint : palette.mutedText}
                                />
                            )}
                            actions={[
                                {
                                    icon: 'create-outline',
                                    label: t('products.list.edit'),
                                    onPress: () => onEdit({ id: method.id, name: method.name, icon: method.icon, is_active: method.is_active }),
                                },
                                {
                                    icon: method.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline',
                                    label: method.is_active ? t('common.disable') : t('common.enable'),
                                    tone: method.is_active ? 'warning' : 'success',
                                    onPress: () => void toggleMethod(method.id, method.is_active),
                                },
                                {
                                    icon: 'trash-outline',
                                    label: t('common.delete'),
                                    tone: 'danger',
                                    collapseOnNarrow: true,
                                    onPress: () => void deleteMethod(method.id),
                                },
                            ]}
                        />
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
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        flex: 1,
        minWidth: 120,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
