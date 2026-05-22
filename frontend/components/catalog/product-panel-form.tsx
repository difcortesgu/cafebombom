import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import type { ProductAdditionalIngredientInput, ProductRecipeInput } from '@/types/products';

export type ProductPanelFormProps = {
    mode: 'create' | { productId: string };
    onClose: () => void;
};

export function ProductPanelForm({ mode, onClose }: ProductPanelFormProps) {
    const palette = useAppColors();
    const { ingredients } = useInventoryStore();
    const {
        products,
        categories,
        productIngredients,
        productAdditionalIngredients,
        createProduct,
        updateProduct,
        addCategory,
        setProductIngredient,
        removeProductIngredient,
        setProductAdditionalIngredient,
        removeProductAdditionalIngredient,
    } = useProductsStore();

    const [productForm, setProductForm] = useState({ name: '', price: '', categoryId: null as string | null, imageUri: null as string | null });
    const [recipeItems, setRecipeItems] = useState<{ ingredientId: string; quantityUsed: string }[]>([]);
    const [additionalItems, setAdditionalItems] = useState<{ ingredientId: string; quantityUsed: string; additionalPrice: string }[]>([]);
    const [sections, setSections] = useState({ general: true, recipe: true, additional: false });
    const [message, setMessage] = useState('');

    const isEdit = mode !== 'create';

    const categoryOptions = useMemo(
        () => [
            { value: '', label: t('productForm.none') },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
        ],
        [categories],
    );

    useEffect(() => {
        setMessage('');
        if (mode === 'create') {
            setProductForm({ name: '', price: '', categoryId: null, imageUri: null });
            setRecipeItems([{ ingredientId: '', quantityUsed: '' }]);
            setAdditionalItems([]);
            setSections({ general: true, recipe: true, additional: false });
        } else {
            const item = products.find((p) => p.id === mode.productId);
            if (item) setProductForm({ name: item.name, price: String(item.price), categoryId: item.categoryId, imageUri: item.imageUri ?? null });
            setRecipeItems([]);
            setAdditionalItems([]);
            setSections({ general: true, recipe: false, additional: false });
        }
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    async function submit() {
        if (!productForm.name.trim()) { setMessage(t('productForm.error.nameRequired')); return; }
        const price = Number(productForm.price || '0');
        if (price <= 0) { setMessage(t('productForm.error.pricePositive')); return; }

        if (mode === 'create') {
            if (recipeItems.length === 0) { setMessage(t('productForm.error.recipeRequired')); return; }
            const invalidRecipe = recipeItems.filter((item) => !item.ingredientId || Number(item.quantityUsed || '0') <= 0);
            if (invalidRecipe.length > 0) { setMessage(t('productForm.error.recipeItemInvalid')); return; }
            const invalidAdditional = additionalItems.filter(
                (item) => !item.ingredientId || Number(item.quantityUsed || '0') <= 0 || Number(item.additionalPrice || '0') < 0,
            );
            if (invalidAdditional.length > 0) { setMessage(t('productForm.error.additionalItemInvalid')); return; }

            const recipe = recipeItems.map((item) => ({
                ingredientId: item.ingredientId,
                quantityUsed: Number(item.quantityUsed),
            })) as [ProductRecipeInput, ...ProductRecipeInput[]];

            const additionalIngredientInputs = additionalItems
                .map((item) => ({
                    ingredientId: item.ingredientId,
                    quantityUsed: Number(item.quantityUsed),
                    additionalPrice: Number(item.additionalPrice || '0'),
                }))
                .filter((item) => item.ingredientId && item.quantityUsed > 0 && item.additionalPrice >= 0) as ProductAdditionalIngredientInput[];

            await createProduct({
                name: productForm.name.trim(),
                categoryId: productForm.categoryId ?? undefined,
                price,
                imageUri: productForm.imageUri ?? undefined,
                recipe,
                additionalIngredients: additionalIngredientInputs,
            });
        } else {
            await updateProduct({ id: mode.productId, name: productForm.name.trim(), price, categoryId: productForm.categoryId, imageUri: productForm.imageUri });
        }
        onClose();
    }

    const addRecipeDraft = () => setRecipeItems((items) => [...items, { ingredientId: '', quantityUsed: '' }]);
    const updateRecipeDraft = (index: number, updates: Partial<{ ingredientId: string; quantityUsed: string }>) =>
        setRecipeItems((items) => items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
    const removeRecipeDraft = (index: number) => setRecipeItems((items) => items.filter((_, i) => i !== index));

    const addAdditionalDraft = () => setAdditionalItems((items) => [...items, { ingredientId: '', quantityUsed: '', additionalPrice: '' }]);
    const updateAdditionalDraft = (index: number, updates: Partial<{ ingredientId: string; quantityUsed: string; additionalPrice: string }>) =>
        setAdditionalItems((items) => items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
    const removeAdditionalDraft = (index: number) => setAdditionalItems((items) => items.filter((_, i) => i !== index));

    async function saveRecipe() {
        if (mode === 'create' || recipeItems.length === 0) return;
        const productId = mode.productId;
        const invalid = recipeItems.find((item) => !item.ingredientId || Number(item.quantityUsed || '0') <= 0);
        if (invalid) { setMessage(t('productForm.error.recipeItemInvalid')); return; }
        for (const item of recipeItems) {
            await setProductIngredient({ productId, ingredientId: item.ingredientId, quantityUsed: Number(item.quantityUsed) });
        }
        setRecipeItems([]);
        setMessage('');
    }

    async function saveAdditional() {
        if (mode === 'create' || additionalItems.length === 0) return;
        const productId = mode.productId;
        const invalid = additionalItems.find(
            (item) => !item.ingredientId || Number(item.quantityUsed || '0') <= 0 || Number(item.additionalPrice || '0') < 0,
        );
        if (invalid) { setMessage(t('productForm.error.additionalItemInvalid')); return; }
        for (const item of additionalItems) {
            await setProductAdditionalIngredient({
                productId,
                ingredientId: item.ingredientId,
                quantityUsed: Number(item.quantityUsed),
                additionalPrice: Number(item.additionalPrice || '0'),
            });
        }
        setAdditionalItems([]);
        setMessage('');
    }

    async function pickImage() {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            setProductForm((f) => ({ ...f, imageUri: result.assets[0].uri }));
        }
    }

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="storefront-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">
                        {isEdit ? t('productForm.title.edit') : t('productForm.title.create')}
                    </ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                {message ? (
                    <View style={[styles.messageBanner, { backgroundColor: palette.danger + '22', borderColor: palette.danger + '44' }]}>
                        <ThemedText style={{ color: palette.danger, fontSize: 13 }}>{message}</ThemedText>
                    </View>
                ) : null}

                {/* General section */}
                <Pressable
                    style={[styles.collapsibleHeader, { borderColor: palette.border }]}
                    onPress={() => setSections((s) => ({ ...s, general: !s.general }))}
                >
                    <View style={styles.collapsibleHeaderLeft}>
                        <Ionicons name="information-circle-outline" size={16} color={palette.tint} />
                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.panel.sectionGeneral')}</ThemedText>
                    </View>
                    <Ionicons name={sections.general ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                </Pressable>
                {sections.general ? (
                    <View style={styles.collapsibleContent}>
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                                <ThemedText style={styles.smallLabel}>{t('productForm.name')}</ThemedText>
                            </View>
                            <ThemedInput value={productForm.name} onChangeText={(v) => setProductForm((f) => ({ ...f, name: v }))} style={styles.input} />
                        </View>
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Ionicons name="pricetag-outline" size={14} color={palette.mutedText} />
                                <ThemedText style={styles.smallLabel}>{t('productForm.price')}</ThemedText>
                            </View>
                            <ThemedInput keyboardType="decimal-pad" value={productForm.price} onChangeText={(v) => setProductForm((f) => ({ ...f, price: v }))} style={styles.input} />
                        </View>
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Ionicons name="folder-outline" size={14} color={palette.mutedText} />
                                <ThemedText style={styles.smallLabel}>{t('productForm.category')}</ThemedText>
                            </View>
                            <ThemedSelect
                                value={productForm.categoryId ?? ''}
                                onValueChange={(v) => setProductForm((f) => ({ ...f, categoryId: v || null }))}
                                items={categoryOptions}
                                placeholder={t('productForm.none')}
                                modalTitle={t('productForm.category')}
                                onAddNew={async (name) => {
                                    const id = await addCategory({ name: name.trim() });
                                    if (id) setProductForm((f) => ({ ...f, categoryId: id }));
                                }}
                                addNewPlaceholder={t('productForm.addCategory')}
                            />
                        </View>
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Ionicons name="image-outline" size={14} color={palette.mutedText} />
                                <ThemedText style={styles.smallLabel}>{t('productForm.image')}</ThemedText>
                            </View>
                            {productForm.imageUri ? (
                                <View style={styles.panelImageRow}>
                                    <Image source={{ uri: productForm.imageUri }} style={styles.panelImageThumb} resizeMode="cover" />
                                    <ThemedButton variant="secondary" style={styles.smallPanelBtn} label={t('productForm.removeImage')} onPress={() => setProductForm((f) => ({ ...f, imageUri: null }))} />
                                </View>
                            ) : (
                                <ThemedButton variant="secondary" style={styles.input} label={t('productForm.pickImage')} onPress={() => void pickImage()} />
                            )}
                        </View>
                    </View>
                ) : null}

                {/* Recipe section */}
                <Pressable
                    style={[styles.collapsibleHeader, { borderColor: palette.border }]}
                    onPress={() => setSections((s) => ({ ...s, recipe: !s.recipe }))}
                >
                    <View style={styles.collapsibleHeaderLeft}>
                        <Ionicons name="flask-outline" size={16} color={palette.tint} />
                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.panel.sectionRecipe')}</ThemedText>
                    </View>
                    <Ionicons name={sections.recipe ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                </Pressable>
                {sections.recipe ? (
                    <View style={styles.collapsibleContent}>
                        {isEdit ? (() => {
                            const recipeLinks = productIngredients.filter((link) => link.productId === (mode as { productId: string }).productId);
                            return recipeLinks.length === 0 ? (
                                <ThemedText style={styles.smallLabel}>{t('productForm.noDirectIngredients')}</ThemedText>
                            ) : recipeLinks.map((link) => (
                                <View key={link.id} style={[styles.panelListItem, { borderColor: palette.border }]}>
                                    <View style={styles.flex1}>
                                        <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>{link.ingredientName}</ThemedText>
                                        <ThemedText style={styles.smallLabel}>{link.quantityUsed} {t('productForm.perUnit')}</ThemedText>
                                    </View>
                                    <Pressable
                                        hitSlop={8}
                                        onPress={async () => {
                                            if (recipeLinks.length <= 1) { setMessage(t('productForm.error.keepOneIngredient')); return; }
                                            await removeProductIngredient({ productId: (mode as { productId: string }).productId, ingredientId: link.ingredientId });
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                                    </Pressable>
                                </View>
                            ));
                        })() : null}
                        <ThemedText style={[styles.smallLabel, { marginTop: 8 }]}>{t('productForm.addRecipeIngredients')}</ThemedText>
                        {recipeItems.length === 0 ? (
                            <ThemedText style={styles.smallLabel}>{t('productForm.addRecipeHelp')}</ThemedText>
                        ) : recipeItems.map((item, index) => {
                            const productId = isEdit ? (mode as { productId: string }).productId : null;
                            const reservedIds = recipeItems.filter((_, i) => i !== index).map((d) => d.ingredientId).filter(Boolean);
                            const usedIds = productId ? productIngredients.filter((l) => l.productId === productId).map((l) => l.ingredientId) : [];
                            const available = ingredients.filter((ing) => ![...usedIds, ...reservedIds].includes(ing.id) || ing.id === item.ingredientId);
                            return (
                                <View key={`recipe-draft-${index}`} style={[styles.ingredientCard, { borderColor: palette.tint + '66', backgroundColor: palette.inputBackground }]}>
                                    <View style={styles.ingredientCardHeader}>
                                        <View style={styles.labelRow}>
                                            <Ionicons name="leaf-outline" size={13} color={palette.mutedText} />
                                            <ThemedText style={styles.smallLabel}>{t('productForm.selectIngredient')}</ThemedText>
                                        </View>
                                        <Pressable hitSlop={8} onPress={() => removeRecipeDraft(index)}>
                                            <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
                                        </Pressable>
                                    </View>
                                    <ThemedSelect
                                        placeholder={t('productForm.selectIngredient')}
                                        value={item.ingredientId}
                                        items={available.map((ing) => ({ label: ing.name, value: ing.id }))}
                                        onValueChange={(value) => updateRecipeDraft(index, { ingredientId: value })}
                                    />
                                    <View style={styles.labelRow}>
                                        <Ionicons name="scale-outline" size={13} color={palette.mutedText} />
                                        <ThemedText style={styles.smallLabel}>{t('common.qtyShort')}</ThemedText>
                                    </View>
                                    <ThemedInput
                                        placeholder="0"
                                        keyboardType="decimal-pad"
                                        value={item.quantityUsed}
                                        onChangeText={(value) => updateRecipeDraft(index, { quantityUsed: value })}
                                        style={styles.input}
                                    />
                                </View>
                            );
                        })}
                        <View style={styles.panelRowActions}>
                            <ThemedButton variant="secondary" style={styles.smallPanelBtn} label={t('productForm.addIngredient')} onPress={addRecipeDraft} />
                            {isEdit ? (
                                <ThemedButton style={styles.smallPanelBtn} label={t('productForm.saveRecipeItems')} onPress={() => void saveRecipe()} />
                            ) : null}
                        </View>
                    </View>
                ) : null}

                {/* Additional section */}
                <Pressable
                    style={[styles.collapsibleHeader, { borderColor: palette.border }]}
                    onPress={() => setSections((s) => ({ ...s, additional: !s.additional }))}
                >
                    <View style={styles.collapsibleHeaderLeft}>
                        <Ionicons name="add-circle-outline" size={16} color={palette.tint} />
                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.panel.sectionAdditional')}</ThemedText>
                    </View>
                    <Ionicons name={sections.additional ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                </Pressable>
                {sections.additional ? (
                    <View style={styles.collapsibleContent}>
                        {isEdit ? (() => {
                            const productId = (mode as { productId: string }).productId;
                            const additionalLinks = productAdditionalIngredients.filter((link) => link.productId === productId);
                            return additionalLinks.length === 0 ? (
                                <ThemedText style={styles.smallLabel}>{t('productForm.noAdditionalIngredients')}</ThemedText>
                            ) : additionalLinks.map((link) => (
                                <View key={link.id} style={[styles.panelListItem, { borderColor: palette.border }]}>
                                    <View style={styles.flex1}>
                                        <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>{link.ingredientName}</ThemedText>
                                        <ThemedText style={styles.smallLabel}>{link.quantityUsed} {t('productForm.perUnit')} · +${link.additionalPrice.toFixed(2)}</ThemedText>
                                    </View>
                                    <Pressable
                                        hitSlop={8}
                                        onPress={async () => { await removeProductAdditionalIngredient({ productId, ingredientId: link.ingredientId }); }}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                                    </Pressable>
                                </View>
                            ));
                        })() : null}
                        <ThemedText style={[styles.smallLabel, { marginTop: 8 }]}>{t('productForm.addAdditionalIngredients')}</ThemedText>
                        {additionalItems.length === 0 ? (
                            <ThemedText style={styles.smallLabel}>{t('productForm.addAdditionalHelp')}</ThemedText>
                        ) : additionalItems.map((item, index) => {
                            const productId = isEdit ? (mode as { productId: string }).productId : null;
                            const reservedIds = additionalItems.filter((_, i) => i !== index).map((d) => d.ingredientId).filter(Boolean);
                            const usedIds = productId ? productAdditionalIngredients.filter((l) => l.productId === productId).map((l) => l.ingredientId) : [];
                            const available = ingredients.filter((ing) => ![...usedIds, ...reservedIds].includes(ing.id) || ing.id === item.ingredientId);
                            return (
                                <View key={`additional-draft-${index}`} style={[styles.ingredientCard, { borderColor: palette.tint + '66', backgroundColor: palette.inputBackground }]}>
                                    <View style={styles.ingredientCardHeader}>
                                        <View style={styles.labelRow}>
                                            <Ionicons name="leaf-outline" size={13} color={palette.mutedText} />
                                            <ThemedText style={styles.smallLabel}>{t('productForm.selectIngredient')}</ThemedText>
                                        </View>
                                        <Pressable hitSlop={8} onPress={() => removeAdditionalDraft(index)}>
                                            <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
                                        </Pressable>
                                    </View>
                                    <ThemedSelect
                                        placeholder={t('productForm.selectIngredient')}
                                        value={item.ingredientId}
                                        items={available.map((ing) => ({ label: ing.name, value: ing.id }))}
                                        onValueChange={(value) => updateAdditionalDraft(index, { ingredientId: value })}
                                    />
                                    <View style={styles.ingredientCardInputs}>
                                        <View style={styles.ingredientCardField}>
                                            <View style={styles.labelRow}>
                                                <Ionicons name="scale-outline" size={13} color={palette.mutedText} />
                                                <ThemedText style={styles.smallLabel}>{t('common.qtyShort')}</ThemedText>
                                            </View>
                                            <ThemedInput
                                                placeholder="0"
                                                keyboardType="decimal-pad"
                                                value={item.quantityUsed}
                                                onChangeText={(value) => updateAdditionalDraft(index, { quantityUsed: value })}
                                                style={styles.input}
                                            />
                                        </View>
                                        <View style={styles.ingredientCardField}>
                                            <View style={styles.labelRow}>
                                                <Ionicons name="pricetag-outline" size={13} color={palette.mutedText} />
                                                <ThemedText style={styles.smallLabel}>{t('productForm.additionalPrice')}</ThemedText>
                                            </View>
                                            <ThemedInput
                                                placeholder="0.00"
                                                keyboardType="decimal-pad"
                                                value={item.additionalPrice}
                                                onChangeText={(value) => updateAdditionalDraft(index, { additionalPrice: value })}
                                                style={styles.input}
                                            />
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                        <View style={styles.panelRowActions}>
                            <ThemedButton variant="secondary" style={styles.smallPanelBtn} label={t('productForm.addAdditionalIngredient')} onPress={addAdditionalDraft} />
                            {isEdit ? (
                                <ThemedButton style={styles.smallPanelBtn} label={t('productForm.saveAdditionalItems')} onPress={() => void saveAdditional()} />
                            ) : null}
                        </View>
                    </View>
                ) : null}
            </ScrollView>

            <View style={[styles.panelFooter, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                <ThemedButton
                    style={styles.saveButton}
                    label={isEdit ? t('common.saveChanges') : t('productForm.title.create')}
                    icon="checkmark-circle"
                    onPress={() => void submit()}
                />
                <ThemedButton
                    variant="secondary"
                    label={t('common.back')}
                    onPress={onClose}
                    style={styles.backButton}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    panelHeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    panelContent: {
        padding: 16,
        gap: 14,
    },
    messageBanner: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    fieldGroup: {
        gap: 6,
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
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    flex1: {
        flex: 1,
        gap: 6,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 2,
        borderBottomWidth: 1,
        marginBottom: 2,
    },
    collapsibleHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    collapsibleHeaderText: {
        fontSize: 13,
    },
    collapsibleContent: {
        gap: 8,
        paddingBottom: 4,
    },
    panelListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
    },
    ingredientCard: {
        gap: 6,
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
    },
    ingredientCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ingredientCardInputs: {
        flexDirection: 'row',
        gap: 8,
    },
    ingredientCardField: {
        flex: 1,
        gap: 4,
    },
    panelRowActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    smallPanelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    panelImageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    panelImageThumb: {
        width: 56,
        height: 56,
        borderRadius: 8,
    },
    panelFooter: {
        padding: 14,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 10,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
});
