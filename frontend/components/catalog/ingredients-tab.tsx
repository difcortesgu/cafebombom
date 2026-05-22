import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { t } from '@/i18n';

type IngredientListItem = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    low_stock_threshold: number;
};

type IngredientsTabProps = {
    ingredients: IngredientListItem[];
    cardWidth: number;
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
};

export function IngredientsTab({ ingredients, cardWidth, gap, palette, onEditIngredient }: IngredientsTabProps) {
    if (ingredients.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('inventory.ingredients.empty')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]}>
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
                    <View key={ingredient.id} style={[styles.card, { width: cardWidth, backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderLeft}>
                                <ThemedText style={styles.cardName} numberOfLines={1}>{ingredient.name}</ThemedText>
                                {(isCritical || isLow) ? (
                                    <Ionicons name="warning-outline" size={14} color={statusColor} />
                                ) : null}
                            </View>
                            <ThemedButton
                                icon="pencil"
                                variant="secondary"
                                style={styles.editBtn}
                                onPress={() => onEditIngredient(ingredient.id)}
                            />
                        </View>
                        <ThemedText style={[styles.qty, { color: palette.text }]}>
                            {displayQty}{' '}
                            <ThemedText style={[styles.unit, { color: palette.mutedText }]}>{ingredient.unit}</ThemedText>
                        </ThemedText>
                        <ThemedText style={[styles.threshold, { color: palette.mutedText }]}>
                            {t('products.ingredients.threshold')}: {threshold} {ingredient.unit}
                        </ThemedText>
                        <View style={[styles.progressTrack, { backgroundColor: `${statusColor}30` }]}>
                            <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` as `${number}%`, backgroundColor: statusColor }]} />
                        </View>
                    </View>
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
    cardHeaderLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        overflow: 'hidden',
    },
    cardName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    editBtn: {
        width: 34,
        height: 34,
        minHeight: 0,
        borderRadius: 10,
        paddingHorizontal: 0,
        paddingVertical: 0,
        alignItems: 'center',
        justifyContent: 'center',
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
});
