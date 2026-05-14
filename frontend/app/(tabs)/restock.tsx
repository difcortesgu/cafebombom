import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

export default function RestockScreen() {
    const palette = useAppColors();
    const router = useRouter();
    const { ingredients, hydrate } = useInventoryStore();

    useFocusEffect(
        useCallback(() => {
            void hydrate();
        }, [hydrate]),
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('restock.title')}</ThemedText>
            <ThemedText>{t('restock.subtitle')}</ThemedText>

            {ingredients.length === 0 ? (
                <ThemedCard style={styles.card}>
                    <ThemedText style={styles.muted}>{t('inventory.ingredients.empty')}</ThemedText>
                </ThemedCard>
            ) : (
                ingredients.map((ingredient) => {
                    const qty = Number(ingredient.quantity);
                    const threshold = Number(ingredient.low_stock_threshold);
                    const isLow = qty <= threshold;
                    const isUrgent = qty === 0 || qty <= threshold * 0.5;

                    return (
                        <ThemedCard key={ingredient.id} style={[styles.itemCard, { borderColor: isLow ? (isUrgent ? palette.danger : palette.warning) : palette.border }]}>
                            <View style={styles.rowBetween}>
                                <ThemedText type="defaultSemiBold">{ingredient.name}</ThemedText>
                                {isLow ? (
                                    <ThemedText style={[styles.badge, { backgroundColor: isUrgent ? palette.danger : palette.warning, color: '#fff' }]}>
                                        {isUrgent ? t('inventory.status.critical') : t('inventory.status.low')}
                                    </ThemedText>
                                ) : null}
                            </View>

                            <ThemedText style={styles.muted}>
                                {qty.toFixed(2)} {ingredient.unit} · {t('dashboard.thresholdLabel')}: {threshold.toFixed(2)} {ingredient.unit}
                            </ThemedText>

                            <ThemedButton
                                label={t('restock.action')}
                                onPress={() =>
                                    router.push({
                                        pathname: '/inventory-form',
                                        params: { section: 'restock', ingredientId: ingredient.id },
                                    })
                                }
                            />
                        </ThemedCard>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    card: {
        gap: 8,
    },
    itemCard: {
        gap: 8,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    muted: {
        fontSize: 13,
        opacity: 0.9,
    },
    badge: {
        fontSize: 11,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 99,
        overflow: 'hidden',
    },
});
