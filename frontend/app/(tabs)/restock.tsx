import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { RestockPanel } from '@/components/restock-panel';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

const GRID_GAP = 12;
const PADDING = 16;

function getColumns(width: number) {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
}

export default function RestockScreen() {
    const palette = useAppColors();
    const router = useRouter();
    const { ingredients, hydrate } = useInventoryStore();
    const { width: screenWidth } = useWindowDimensions();
    const isWide = screenWidth >= 768;

    const [panelIngredientId, setPanelIngredientId] = useState('');
    const [panelVisible, setPanelVisible] = useState(false);
    const [panelMounted, setPanelMounted] = useState(false);

    function openPanel(ingredientId: string) {
        setPanelIngredientId(ingredientId);
        setPanelMounted(true);
        setPanelVisible(true);
    }

    function closePanel() {
        setPanelVisible(false);
    }

    useFocusEffect(
        useCallback(() => {
            void hydrate();
        }, [hydrate]),
    );

    const numCols = getColumns(screenWidth);
    const cardWidth = (screenWidth - PADDING * 2 - GRID_GAP * (numCols - 1)) / numCols;

    return (
        <View style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.container}>
                <ThemedText type="title">{t('restock.title')}</ThemedText>
                <ThemedText style={{ color: palette.mutedText }}>{t('restock.subtitle')}</ThemedText>

                {ingredients.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                        <ThemedText style={{ color: palette.mutedText }}>{t('inventory.ingredients.empty')}</ThemedText>
                    </View>
                ) : (
                    <View style={[styles.grid, { gap: GRID_GAP }]}>
                        {ingredients.map((ingredient) => {
                            const qty = Number(ingredient.quantity);
                            const threshold = Number(ingredient.low_stock_threshold);
                            const isCritical = qty <= threshold;
                            const isLow = !isCritical && qty <= threshold * 2;
                            const max = Math.max(qty, threshold * 2);
                            const progress = max > 0 ? Math.min(qty / max, 1) : 0;

                            const statusColor = isCritical ? palette.danger : isLow ? palette.accent : palette.success;
                            const cardBg = isCritical
                                ? palette.danger + '18'
                                : isLow
                                    ? palette.accent + '28'
                                    : palette.card;
                            const borderColor = isCritical ? palette.danger + '55' : isLow ? palette.accent + '88' : palette.border;

                            const displayQty = qty % 1 === 0 ? qty.toFixed(0) : qty % 0.1 === 0 ? qty.toFixed(1) : qty.toFixed(2);
                            const displayThreshold = threshold % 1 === 0 ? threshold.toFixed(0) : threshold.toFixed(2);

                            return (
                                <View
                                    key={ingredient.id}
                                    style={[
                                        styles.card,
                                        {
                                            width: cardWidth,
                                            backgroundColor: cardBg,
                                            borderColor,
                                        },
                                    ]}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardHeaderLeft}>
                                            <ThemedText style={styles.ingredientName} numberOfLines={1}>
                                                {ingredient.name}
                                            </ThemedText>
                                            {(isCritical || isLow) ? (
                                                <IconSymbol
                                                    name="exclamationmark.triangle.fill"
                                                    size={16}
                                                    color={statusColor}
                                                />
                                            ) : null}
                                        </View>
                                        <ThemedButton
                                            icon="add"
                                            style={styles.restockBtn}
                                            onPress={() => {
                                                if (isWide) {
                                                    openPanel(ingredient.id);
                                                } else {
                                                    router.push({
                                                        pathname: '/inventory-form',
                                                        params: { section: 'restock', ingredientId: ingredient.id },
                                                    });
                                                }
                                            }}
                                        />
                                    </View>

                                    <ThemedText style={[styles.qty, { color: palette.text }]}>
                                        {displayQty}{' '}
                                        <ThemedText style={[styles.unit, { color: palette.mutedText }]}>
                                            {ingredient.unit}
                                        </ThemedText>
                                    </ThemedText>

                                    <ThemedText style={[styles.threshold, { color: palette.mutedText }]}>
                                        {t('dashboard.thresholdLabel')}: {displayThreshold} {ingredient.unit}
                                    </ThemedText>

                                    <View style={[styles.progressTrack, { backgroundColor: statusColor + '30' }]}>
                                        <View
                                            style={[
                                                styles.progressBar,
                                                {
                                                    width: `${Math.round(progress * 100)}%` as `${number}%`,
                                                    backgroundColor: statusColor,
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
            {panelMounted ? (
                <RestockPanel
                    visible={panelVisible}
                    ingredientId={panelIngredientId}
                    onClose={closePanel}
                    onExited={() => setPanelMounted(false)}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
    },
    container: {
        padding: PADDING,
        gap: 16,
    },
    emptyCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    card: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
    },
    ingredientName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    qty: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 34,
    },
    unit: {
        fontSize: 18,
        fontWeight: '400',
    },
    threshold: {
        fontSize: 12,
    },
    progressTrack: {
        height: 10,
        borderRadius: 99,
        overflow: 'hidden',
        marginVertical: 4,
    },
    progressBar: {
        height: '100%',
        borderRadius: 99,
    },
    cardHeaderLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        overflow: 'hidden',
    },
    restockBtn: {
        width: 34,
        height: 34,
        minHeight: 0,
        borderRadius: 10,
        paddingHorizontal: 0,
        paddingVertical: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
