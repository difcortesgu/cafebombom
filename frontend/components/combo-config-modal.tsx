import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import type { ComboGroup, ComboGroupOption } from '@/types/types';
import { money } from '@/utils/money';

type SelectedOptions = Map<string, ComboGroupOption[]>;

export type ComboItemCustomization = {
    removedIngredientIds: string[];
    additionalIngredients: { ingredientId: string; quantity: number }[];
    observation: string;
};

export type CustomizationsByOptionId = Map<string, ComboItemCustomization>;

type RecipeIngredient = { ingredientId: string; ingredientName: string };

type ComboConfigModalProps = {
    visible: boolean;
    productName: string;
    productPrice: number;
    comboGroups: ComboGroup[];
    palette: {
        card: string;
        border: string;
        mutedText: string;
        tint: string;
        accent: string;
        text: string;
        inputBackground: string;
        danger?: string;
    };
    productsMap: Map<string, { name: string; price: number }>;
    recipeByProductId: Map<string, RecipeIngredient[]>;
    additionalOptionsByProductId: Map<string, Map<string, { ingredientName: string; additionalPrice: number }>>;
    initialSelections?: SelectedOptions;
    initialCustomizations?: CustomizationsByOptionId;
    onConfirm: (selectedOptions: SelectedOptions, customizations: CustomizationsByOptionId) => void;
    onCancel: () => void;
};

export function ComboConfigModal({
    visible,
    productName,
    productPrice,
    comboGroups,
    palette,
    productsMap,
    recipeByProductId,
    additionalOptionsByProductId,
    initialSelections,
    initialCustomizations,
    onConfirm,
    onCancel,
}: ComboConfigModalProps) {
    const [selections, setSelections] = useState<SelectedOptions>(new Map());
    const [customizations, setCustomizations] = useState<CustomizationsByOptionId>(new Map());

    useEffect(() => {
        if (visible) {
            setSelections(initialSelections ? new Map(initialSelections) : new Map());
            setCustomizations(initialCustomizations ? new Map(initialCustomizations) : new Map());
        }
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    const isGroupValid = (group: ComboGroup) => {
        const count = selections.get(group.id)?.length ?? 0;
        return count >= group.minQuantity && count <= group.maxQuantity;
    };

    const isAllValid = comboGroups.every(isGroupValid);

    const getCustomization = (optionId: string): ComboItemCustomization =>
        customizations.get(optionId) ?? { removedIngredientIds: [], additionalIngredients: [], observation: '' };

    const setCustomization = (optionId: string, update: Partial<ComboItemCustomization>) => {
        setCustomizations((prev) => {
            const next = new Map(prev);
            next.set(optionId, { ...getCustomization(optionId), ...update });
            return next;
        });
    };

    const handleOptionPress = (group: ComboGroup, option: ComboGroupOption) => {
        const current = selections.get(group.id) ?? [];
        const alreadySelected = current.some((o) => o.id === option.id);

        let updated: ComboGroupOption[];
        if (alreadySelected) {
            updated = current.filter((o) => o.id !== option.id);
            setCustomizations((prev) => {
                const next = new Map(prev);
                next.delete(option.id);
                return next;
            });
        } else if (group.maxQuantity === 1) {
            const prev = current[0];
            if (prev) {
                setCustomizations((c) => {
                    const next = new Map(c);
                    next.delete(prev.id);
                    return next;
                });
            }
            updated = [option];
        } else if (current.length >= group.maxQuantity) {
            return;
        } else {
            updated = [...current, option];
        }

        setSelections((prev) => new Map(prev).set(group.id, updated));
    };

    const handleConfirm = () => {
        if (!isAllValid) return;
        onConfirm(selections, customizations);
        reset();
    };

    const handleCancel = () => {
        reset();
        onCancel();
    };

    const reset = () => {
        setSelections(new Map());
        setCustomizations(new Map());
    };

    const toggleRemovedIngredient = (optionId: string, ingredientId: string) => {
        const current = getCustomization(optionId);
        const has = current.removedIngredientIds.includes(ingredientId);
        setCustomization(optionId, {
            removedIngredientIds: has
                ? current.removedIngredientIds.filter((id) => id !== ingredientId)
                : [...current.removedIngredientIds, ingredientId],
        });
    };

    const updateAdditionalQty = (optionId: string, ingredientId: string, delta: number) => {
        const current = getCustomization(optionId);
        const existing = current.additionalIngredients.find((e) => e.ingredientId === ingredientId);
        const newQty = Math.max(0, (existing?.quantity ?? 0) + delta);
        const next = newQty > 0
            ? [...current.additionalIngredients.filter((e) => e.ingredientId !== ingredientId), { ingredientId, quantity: newQty }]
            : current.additionalIngredients.filter((e) => e.ingredientId !== ingredientId);
        setCustomization(optionId, { additionalIngredients: next });
    };

    return (
        <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={handleCancel}>
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={handleCancel} />
                <View style={[styles.sheet, { backgroundColor: palette.card }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: palette.border }]}>
                        <Ionicons name="layers-outline" size={20} color={palette.accent} />
                        <View style={styles.headerText}>
                            <ThemedText style={styles.productName}>{productName}</ThemedText>
                            <ThemedText style={[styles.productPrice, { color: palette.mutedText }]}>
                                {money(productPrice)}
                            </ThemedText>
                        </View>
                        <Pressable onPress={handleCancel} hitSlop={8} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={palette.mutedText} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {comboGroups.map((group) => {
                            const selectedCount = selections.get(group.id)?.length ?? 0;
                            const valid = isGroupValid(group);
                            const isRadio = group.maxQuantity === 1;

                            return (
                                <View key={group.id} style={[styles.group, { borderColor: palette.border }]}>
                                    {/* Group header */}
                                    <View style={styles.groupHeader}>
                                        <View style={styles.groupHeaderLeft}>
                                            <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                                            <ThemedText style={[styles.groupHint, { color: palette.mutedText }]}>
                                                {isRadio ? 'Elige 1 opción' : `Elige entre ${group.minQuantity} y ${group.maxQuantity}`}
                                            </ThemedText>
                                        </View>
                                        <View style={[
                                            styles.countBadge,
                                            { backgroundColor: valid ? palette.tint + '20' : (palette.danger ? palette.danger + '20' : '#FEE2E2') },
                                        ]}>
                                            <ThemedText style={[styles.countText, { color: valid ? palette.tint : (palette.danger ?? '#EF4444') }]}>
                                                {isRadio ? (selectedCount === 1 ? '✓' : '—') : `${selectedCount}/${group.maxQuantity}`}
                                            </ThemedText>
                                        </View>
                                    </View>

                                    {/* Options */}
                                    {group.options.map((option) => {
                                        const productInfo = productsMap.get(option.productId);
                                        const isSelected = (selections.get(group.id) ?? []).some((o) => o.id === option.id);
                                        const atMax = !isSelected && !isRadio && selectedCount >= group.maxQuantity;
                                        const recipe = recipeByProductId.get(option.productId) ?? [];
                                        const additionals = additionalOptionsByProductId.get(option.productId);
                                        const customization = getCustomization(option.id);
                                        const hasCustomizable = recipe.length > 0 || (additionals && additionals.size > 0);

                                        return (
                                            <View key={option.id}>
                                                {/* Option button */}
                                                <Pressable
                                                    style={[
                                                        styles.optionBtn,
                                                        {
                                                            borderColor: isSelected ? palette.tint : palette.border,
                                                            backgroundColor: isSelected ? palette.tint + '15' : palette.inputBackground,
                                                            opacity: atMax ? 0.4 : 1,
                                                        },
                                                    ]}
                                                    onPress={() => handleOptionPress(group, option)}
                                                    disabled={atMax}
                                                >
                                                    <Ionicons
                                                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                                        size={18}
                                                        color={isSelected ? palette.tint : palette.mutedText}
                                                    />
                                                    <View style={styles.optionText}>
                                                        <ThemedText style={[styles.optionName, isSelected && { color: palette.tint }]}>
                                                            {productInfo?.name ?? option.productId}
                                                        </ThemedText>
                                                        {option.additionalPrice > 0 && (
                                                            <ThemedText style={[styles.optionPrice, { color: palette.mutedText }]}>
                                                                +{money(option.additionalPrice)}
                                                            </ThemedText>
                                                        )}
                                                    </View>
                                                </Pressable>

                                                {/* Inline customization (appears when selected) */}
                                                {isSelected && hasCustomizable && (
                                                    <View style={[styles.customizePanel, { borderColor: palette.tint + '40', backgroundColor: palette.tint + '08' }]}>
                                                        {/* Remove ingredients */}
                                                        {recipe.length > 0 && (
                                                            <View style={styles.customizeSection}>
                                                                <ThemedText style={[styles.customizeSectionLabel, { color: palette.mutedText }]}>
                                                                    QUITAR
                                                                </ThemedText>
                                                                <View style={styles.chipsRow}>
                                                                    {recipe.map((ing) => {
                                                                        const removed = customization.removedIngredientIds.includes(ing.ingredientId);
                                                                        return (
                                                                            <Pressable
                                                                                key={ing.ingredientId}
                                                                                onPress={() => toggleRemovedIngredient(option.id, ing.ingredientId)}
                                                                                style={[
                                                                                    styles.ingredientChip,
                                                                                    {
                                                                                        borderColor: removed ? (palette.danger ?? '#C62828') : palette.border,
                                                                                        backgroundColor: removed ? (palette.danger ?? '#C62828') + '18' : palette.card,
                                                                                    },
                                                                                ]}
                                                                            >
                                                                                {removed && (
                                                                                    <Ionicons name="close-circle" size={12} color={palette.danger ?? '#C62828'} style={{ marginRight: 2 }} />
                                                                                )}
                                                                                <ThemedText style={[styles.chipText, removed && { color: palette.danger ?? '#C62828' }]}>
                                                                                    {ing.ingredientName}
                                                                                </ThemedText>
                                                                            </Pressable>
                                                                        );
                                                                    })}
                                                                </View>
                                                            </View>
                                                        )}

                                                        {/* Additional ingredients */}
                                                        {additionals && additionals.size > 0 && (
                                                            <View style={styles.customizeSection}>
                                                                <ThemedText style={[styles.customizeSectionLabel, { color: palette.mutedText }]}>
                                                                    AGREGAR
                                                                </ThemedText>
                                                                {Array.from(additionals.entries()).map(([ingredientId, info]) => {
                                                                    const qty = customization.additionalIngredients.find((e) => e.ingredientId === ingredientId)?.quantity ?? 0;
                                                                    return (
                                                                        <View
                                                                            key={ingredientId}
                                                                            style={[
                                                                                styles.additionalRow,
                                                                                { borderColor: qty > 0 ? palette.tint : palette.border, backgroundColor: palette.card },
                                                                            ]}
                                                                        >
                                                                            <View style={{ flex: 1 }}>
                                                                                <ThemedText style={styles.chipText}>{info.ingredientName}</ThemedText>
                                                                                <ThemedText style={[styles.groupHint, { color: palette.mutedText }]}>
                                                                                    +{money(info.additionalPrice)}
                                                                                </ThemedText>
                                                                            </View>
                                                                            <View style={styles.qtyRow}>
                                                                                <Pressable
                                                                                    style={[styles.qtyBtn, { borderColor: palette.border, backgroundColor: palette.inputBackground }]}
                                                                                    onPress={() => updateAdditionalQty(option.id, ingredientId, -1)}
                                                                                >
                                                                                    <ThemedText style={styles.qtyBtnText}>−</ThemedText>
                                                                                </Pressable>
                                                                                <ThemedText style={styles.qtyCount}>{qty}</ThemedText>
                                                                                <Pressable
                                                                                    style={[styles.qtyBtn, { borderColor: palette.border, backgroundColor: palette.inputBackground }]}
                                                                                    onPress={() => updateAdditionalQty(option.id, ingredientId, 1)}
                                                                                >
                                                                                    <ThemedText style={styles.qtyBtnText}>+</ThemedText>
                                                                                </Pressable>
                                                                            </View>
                                                                        </View>
                                                                    );
                                                                })}
                                                            </View>
                                                        )}

                                                        {/* Observation */}
                                                        <View style={styles.customizeSection}>
                                                            <ThemedText style={[styles.customizeSectionLabel, { color: palette.mutedText }]}>
                                                                OBSERVACIÓN
                                                            </ThemedText>
                                                            <TextInput
                                                                value={customization.observation}
                                                                onChangeText={(v) => setCustomization(option.id, { observation: v })}
                                                                placeholder="Ej: sin sal, bien cocido..."
                                                                placeholderTextColor={`${palette.text}50`}
                                                                style={[
                                                                    styles.observationInput,
                                                                    { borderColor: palette.border, color: palette.text, backgroundColor: palette.card },
                                                                ]}
                                                            />
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { borderTopColor: palette.border }]}>
                        <ThemedButton label="Cancelar" variant="secondary" onPress={handleCancel} style={styles.footerBtn} />
                        <ThemedButton
                            label="Agregar al carrito"
                            onPress={handleConfirm}
                            disabled={!isAllValid}
                            style={styles.footerBtn}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingTop: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerText: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
    },
    productPrice: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    scroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    group: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        gap: 10,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    groupHeaderLeft: {
        flex: 1,
        gap: 2,
    },
    groupName: {
        fontSize: 14,
        fontWeight: '600',
    },
    groupHint: {
        fontSize: 12,
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        minWidth: 36,
        alignItems: 'center',
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    optionText: {
        flex: 1,
        gap: 2,
    },
    optionName: {
        fontSize: 13,
        fontWeight: '500',
    },
    optionPrice: {
        fontSize: 11,
    },
    customizePanel: {
        borderWidth: 1,
        borderTopWidth: 0,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        padding: 12,
        gap: 12,
        marginTop: -4,
    },
    customizeSection: {
        gap: 8,
    },
    customizeSectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    ingredientChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    additionalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 8,
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    qtyBtn: {
        borderWidth: 1,
        borderRadius: 6,
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyBtnText: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 16,
    },
    qtyCount: {
        minWidth: 20,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
    },
    observationInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
    },
    footer: {
        flexDirection: 'row',
        gap: 10,
        padding: 16,
        borderTopWidth: 1,
        paddingBottom: 24,
    },
    footerBtn: {
        flex: 1,
        paddingVertical: 13,
    },
});
