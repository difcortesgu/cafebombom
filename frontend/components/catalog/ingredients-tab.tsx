import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { t } from '@/i18n';

type IngredientListItem = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    low_stock_threshold: number;
    is_active: boolean;
};

type IngredientsTabProps = {
    ingredients: IngredientListItem[];
    gap: number;
    palette: {
        danger: string;
        accent: string;
        success: string;
        card: string;
        border: string;
        mutedText: string;
        text: string;
        inputBackground: string;
    };
    onEditIngredient: (ingredientId: string) => void;
    onDeleteIngredient: (ingredientId: string) => void;
    onToggleIngredientActive: (ingredientId: string, isActive: boolean) => void;
};

export function IngredientsTab({ ingredients, gap, palette, onEditIngredient, onDeleteIngredient, onToggleIngredientActive }: IngredientsTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);

    if (ingredients.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('inventory.ingredients.empty')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]} onLayout={onLayout}>
            {ingredients.map((ingredient) => {
                const qty = Number(ingredient.quantity);
                const threshold = Number(ingredient.low_stock_threshold);
                const isCritical = qty <= threshold;
                const isLow = !isCritical && qty <= threshold * 2;
                const statusColor = isCritical ? palette.danger : isLow ? palette.accent : palette.success;
                const cardBg = isCritical ? `${palette.danger}18` : isLow ? `${palette.accent}28` : palette.card;
                const borderColor = isCritical ? `${palette.danger}55` : isLow ? `${palette.accent}88` : palette.border;
                const max = Math.max(qty, threshold * 2);
                const progress = max > 0 ? Math.min(qty / max, 1) : 0;
                const displayQty = qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2);

                return (
                    <EntityCard
                        key={ingredient.id}
                        width={cardWidth}
                        title={ingredient.name}
                        style={{ backgroundColor: cardBg, borderColor, opacity: ingredient.is_active ? 1 : 0.6 }}
                        titleTrailing={(isCritical || isLow) ? (
                            <Ionicons name="warning-outline" size={14} color={statusColor} />
                        ) : undefined}
                        info={(
                            <>
                                <ThemedText style={[styles.qty, { color: palette.text }]}>
                                    {displayQty}{' '}
                                    <ThemedText style={[styles.unit, { color: palette.mutedText }]}>{ingredient.unit}</ThemedText>
                                </ThemedText>
                                <ThemedText style={[styles.threshold, { color: palette.mutedText }]}>
                                    {t('products.ingredients.threshold')}: {threshold} {ingredient.unit}
                                </ThemedText>
                            </>
                        )}
                        actions={[
                            {
                                icon: 'create-outline',
                                label: t('products.ingredients.edit'),
                                onPress: () => onEditIngredient(ingredient.id),
                            },
                            {
                                icon: ingredient.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline',
                                label: ingredient.is_active ? t('common.disable') : t('common.enable'),
                                tone: ingredient.is_active ? 'warning' : 'success',
                                onPress: () => onToggleIngredientActive(ingredient.id, ingredient.is_active),
                            },
                            {
                                icon: 'trash-outline',
                                label: t('common.delete'),
                                tone: 'danger',
                                collapseOnNarrow: true,
                                onPress: () => onDeleteIngredient(ingredient.id),
                            },
                        ]}
                    >
                        <View style={[styles.progressTrack, { backgroundColor: `${statusColor}30` }]}>
                            <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` as `${number}%`, backgroundColor: statusColor }]} />
                        </View>
                    </EntityCard>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
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
    qty: {
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 30,
    },
    unit: {
        fontSize: 16,
        fontWeight: '400',
    },
    threshold: {
        fontSize: 12,
        textAlign: 'right',
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
});
