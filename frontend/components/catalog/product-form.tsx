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

export type ProductFormProps = {
    mode: 'create' | { productId: string };
    onClose: () => void;
};

export function ProductForm({ mode, onClose }: ProductFormProps) {
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

    // Lista unificada de elementos guardados temporalmente en el formulario
    const [recipeItems, setRecipeItems] = useState<{ ingredientId: string; quantityUsed: string }[]>([]);
    const [additionalItems, setAdditionalItems] = useState<{ ingredientId: string; quantityUsed: string; additionalPrice: string }[]>([]);

    // Objeto único para controlar el elemento que se está agregando actualmente
    const [draftRecipe, setDraftRecipe] = useState<{ ingredientId: string; quantityUsed: string } | null>(null);
    const [draftAdditional, setDraftAdditional] = useState<{ ingredientId: string; quantityUsed: string; additionalPrice: string } | null>(null);

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

    // Carga inicial de datos
    useEffect(() => {
        setMessage('');
        setDraftRecipe(null);
        setDraftAdditional(null);

        if (mode === 'create') {
            setProductForm({ name: '', price: '', categoryId: null, imageUri: null });
            setRecipeItems([]);
            setAdditionalItems([]);
            setSections({ general: true, recipe: true, additional: false });
        } else {
            const item = products.find((p) => p.id === mode.productId);
            if (item) setProductForm({ name: item.name, price: String(item.price), categoryId: item.categoryId, imageUri: item.imageUri ?? null });

            // Llenamos las listas locales con los datos existentes
            const existingRecipes = productIngredients
                .filter(link => link.productId === mode.productId)
                .map(link => ({ ingredientId: link.ingredientId, quantityUsed: String(link.quantityUsed) }));
            setRecipeItems(existingRecipes);

            const existingAdditional = productAdditionalIngredients
                .filter(link => link.productId === mode.productId)
                .map(link => ({ ingredientId: link.ingredientId, quantityUsed: String(link.quantityUsed), additionalPrice: String(link.additionalPrice) }));
            setAdditionalItems(existingAdditional);

            setSections({ general: true, recipe: true, additional: true });
        }
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    async function submit() {
        if (!productForm.name.trim()) { setMessage(t('productForm.error.nameRequired')); return; }
        const price = Number(productForm.price || '0');
        if (price <= 0) { setMessage(t('productForm.error.pricePositive')); return; }

        const finalRecipe = [...recipeItems];
        if (draftRecipe && draftRecipe.ingredientId && Number(draftRecipe.quantityUsed) > 0) {
            finalRecipe.push(draftRecipe); // Auto-guarda el borrador si es válido y quedó abierto
        }

        const finalAdditional = [...additionalItems];
        if (draftAdditional && draftAdditional.ingredientId && Number(draftAdditional.quantityUsed) > 0 && Number(draftAdditional.additionalPrice) >= 0) {
            finalAdditional.push(draftAdditional);
        }

        if (finalRecipe.length === 0) { setMessage(t('productForm.error.recipeRequired')); return; }

        const parsedRecipe = finalRecipe.map((item) => ({
            ingredientId: item.ingredientId,
            quantityUsed: Number(item.quantityUsed),
        })) as [ProductRecipeInput, ...ProductRecipeInput[]];

        const parsedAdditional = finalAdditional.map((item) => ({
            ingredientId: item.ingredientId,
            quantityUsed: Number(item.quantityUsed),
            additionalPrice: Number(item.additionalPrice || '0'),
        })) as ProductAdditionalIngredientInput[];

        if (mode === 'create') {
            await createProduct({
                name: productForm.name.trim(),
                categoryId: productForm.categoryId ?? undefined,
                price,
                imageUri: productForm.imageUri ?? undefined,
                recipe: parsedRecipe,
                additionalIngredients: parsedAdditional,
            });
        } else {
            // Sincroniza la información del producto
            await updateProduct({ id: mode.productId, name: productForm.name.trim(), price, categoryId: productForm.categoryId, imageUri: productForm.imageUri });

            // Sincroniza los ingredientes de la receta (Agrega/Actualiza y Elimina lo que falte)
            const existingRecipeIds = productIngredients.filter(l => l.productId === mode.productId).map(l => l.ingredientId);
            const newRecipeIds = parsedRecipe.map(r => r.ingredientId);

            for (const oldId of existingRecipeIds) {
                if (!newRecipeIds.includes(oldId)) await removeProductIngredient({ productId: mode.productId, ingredientId: oldId });
            }
            for (const newItem of parsedRecipe) {
                await setProductIngredient({ productId: mode.productId, ingredientId: newItem.ingredientId, quantityUsed: newItem.quantityUsed });
            }

            // Sincroniza los ingredientes adicionales
            const existingAddIds = productAdditionalIngredients.filter(l => l.productId === mode.productId).map(l => l.ingredientId);
            const newAddIds = parsedAdditional.map(a => a.ingredientId);

            for (const oldId of existingAddIds) {
                if (!newAddIds.includes(oldId)) await removeProductAdditionalIngredient({ productId: mode.productId, ingredientId: oldId });
            }
            for (const newItem of parsedAdditional) {
                await setProductAdditionalIngredient({ productId: mode.productId, ingredientId: newItem.ingredientId, quantityUsed: newItem.quantityUsed, additionalPrice: newItem.additionalPrice });
            }
        }
        onClose();
    }

    // --- LÓGICA PARA RECETA ---
    const handleAddRecipe = () => {
        setMessage('');
        setDraftRecipe({ ingredientId: '', quantityUsed: '' });
    };

    const handleSaveRecipe = () => {
        if (!draftRecipe || !draftRecipe.ingredientId || Number(draftRecipe.quantityUsed || '0') <= 0) {
            setMessage(t('productForm.error.recipeItemInvalid'));
            return;
        }
        setMessage('');
        setRecipeItems((prev) => [draftRecipe, ...prev]);
        setDraftRecipe(null);
    };

    // --- LÓGICA PARA ADICIONALES ---
    const handleAddAdditional = () => {
        setMessage('');
        setDraftAdditional({ ingredientId: '', quantityUsed: '', additionalPrice: '' });
    };

    const handleSaveAdditional = () => {
        if (!draftAdditional || !draftAdditional.ingredientId || Number(draftAdditional.quantityUsed || '0') <= 0 || Number(draftAdditional.additionalPrice || '0') < 0) {
            setMessage(t('productForm.error.additionalItemInvalid'));
            return;
        }
        setMessage('');
        setAdditionalItems((prev) => [draftAdditional, ...prev]);
        setDraftAdditional(null);
    };

    async function pickImage() {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            setProductForm((f) => ({ ...f, imageUri: result.assets[0].uri }));
        }
    }

    function getIngredient(id: string) {
        return ingredients.find((i) => i.id === id);
    }

    return (
        <>
            <View style={[styles.Header, { borderBottomColor: palette.border }]}>
                <View style={styles.HeaderTitle}>
                    <Ionicons name="storefront-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">
                        {mode === 'create' ? t('productForm.title.create') : t('productForm.title.edit')}
                    </ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.Content} keyboardShouldPersistTaps="handled">
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
                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.sectionGeneral')}</ThemedText>
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
                                <View style={styles.ImageRow}>
                                    <Image source={{ uri: productForm.imageUri }} style={styles.ImageThumb} resizeMode="cover" />
                                    <ThemedButton variant="secondary" style={styles.smallBtn} label={t('productForm.removeImage')} onPress={() => setProductForm((f) => ({ ...f, imageUri: null }))} />
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
                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.sectionRecipe')}</ThemedText>
                    </View>
                    <Ionicons name={sections.recipe ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                </Pressable>
                {sections.recipe ? (
                    <View style={styles.collapsibleContent}>
                        <ThemedText style={[styles.smallLabel, { marginTop: 8 }]}>{t('productForm.addRecipeIngredients')}</ThemedText>


                        {/* Tarjeta de Formulario para Ingrediente Nuevo */}
                        {draftRecipe ? (
                            <View style={[styles.ingredientCard, { borderColor: palette.tint + '66', backgroundColor: palette.inputBackground, marginBottom: 8 }]}>
                                <View style={styles.ingredientCardHeader}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="leaf-outline" size={13} color={palette.mutedText} />
                                        <ThemedText style={styles.smallLabel}>{t('productForm.selectIngredient')}</ThemedText>
                                    </View>
                                    <Pressable hitSlop={8} onPress={() => setDraftRecipe(null)}>
                                        <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
                                    </Pressable>
                                </View>
                                <ThemedSelect
                                    placeholder={t('productForm.selectIngredient')}
                                    value={draftRecipe.ingredientId}
                                    items={ingredients
                                        .filter(ing => !recipeItems.find(r => r.ingredientId === ing.id))
                                        .map((ing) => ({ label: ing.name, value: ing.id }))}
                                    onValueChange={(value) => setDraftRecipe(prev => prev ? { ...prev, ingredientId: value } : null)}
                                />
                                <View style={styles.labelRow}>
                                    <Ionicons name="scale-outline" size={13} color={palette.mutedText} />
                                    <ThemedText style={styles.smallLabel}>{t('common.qtyShort')} {getIngredient(draftRecipe.ingredientId)?.unit ? `(${getIngredient(draftRecipe.ingredientId)?.unit})` : ""}</ThemedText>
                                </View>
                                <ThemedInput
                                    placeholder="0"
                                    keyboardType="decimal-pad"
                                    value={draftRecipe.quantityUsed}
                                    onChangeText={(value) => setDraftRecipe(prev => prev ? { ...prev, quantityUsed: value } : null)}
                                    style={styles.input}
                                />
                            </View>
                        ) : null}

                        <View style={[styles.RowActions, { marginBottom: 8 }]}>
                            {!draftRecipe ? (
                                <ThemedButton variant="secondary" style={styles.smallBtn} label={t('productForm.addIngredient')} onPress={handleAddRecipe} />
                            ) : (
                                <ThemedButton style={styles.smallBtn} label={t('productForm.saveRecipeItems')} onPress={handleSaveRecipe} />
                            )}
                        </View>


                        {/* Lista Consolidada de Ingredientes */}
                        {recipeItems.length === 0 && !draftRecipe ? (
                            <ThemedText style={styles.smallLabel}>{t('productForm.addRecipeHelp')}</ThemedText>
                        ) : recipeItems.map((item) => {
                            const ingredient = getIngredient(item.ingredientId);
                            if (!ingredient) return null;
                            return (
                                <View key={`recipe-${item.ingredientId}`} style={[styles.ListItem, { borderColor: palette.border, marginBottom: 4 }]}>
                                    <View style={styles.flex1}>
                                        <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>{ingredient.name}</ThemedText>
                                        <ThemedText style={styles.smallLabel}>{item.quantityUsed} {ingredient.unit}</ThemedText>
                                    </View>
                                    <Pressable hitSlop={8} onPress={() => setRecipeItems(items => items.filter(i => i.ingredientId !== item.ingredientId))}>
                                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {/* Additional section */}
                <Pressable
                    style={[styles.collapsibleHeader, { borderColor: palette.border }]}
                    onPress={() => setSections((s) => ({ ...s, additional: !s.additional }))}
                >
                    <View style={styles.collapsibleHeaderLeft}>
                        <Ionicons name="add-circle-outline" size={16} color={palette.tint} />
                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.sectionAdditional')}</ThemedText>
                    </View>
                    <Ionicons name={sections.additional ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                </Pressable>
                {sections.additional ? (
                    <View style={styles.collapsibleContent}>
                        <ThemedText style={[styles.smallLabel, { marginTop: 8 }]}>{t('productForm.addAdditionalIngredients')}</ThemedText>

                        {/* Tarjeta de Formulario para Adicional Nuevo */}
                        {draftAdditional ? (
                            <View style={[styles.ingredientCard, { borderColor: palette.tint + '66', backgroundColor: palette.inputBackground, marginBottom: 8 }]}>
                                <View style={styles.ingredientCardHeader}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="leaf-outline" size={13} color={palette.mutedText} />
                                        <ThemedText style={styles.smallLabel}>{t('productForm.selectIngredient')}</ThemedText>
                                    </View>
                                    <Pressable hitSlop={8} onPress={() => setDraftAdditional(null)}>
                                        <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
                                    </Pressable>
                                </View>
                                <ThemedSelect
                                    placeholder={t('productForm.selectIngredient')}
                                    value={draftAdditional.ingredientId}
                                    items={ingredients
                                        .filter(ing => !additionalItems.find(r => r.ingredientId === ing.id))
                                        .map((ing) => ({ label: ing.name, value: ing.id }))}
                                    onValueChange={(value) => setDraftAdditional(prev => prev ? { ...prev, ingredientId: value } : null)}
                                />
                                <View style={styles.ingredientCardInputs}>
                                    <View style={styles.ingredientCardField}>
                                        <View style={styles.labelRow}>
                                            <Ionicons name="scale-outline" size={13} color={palette.mutedText} />
                                            <ThemedText style={styles.smallLabel}>{t('common.qtyShort')} {getIngredient(draftAdditional.ingredientId)?.unit ? `(${getIngredient(draftAdditional.ingredientId)?.unit})` : ""}</ThemedText>
                                        </View>
                                        <ThemedInput
                                            placeholder="0"
                                            keyboardType="decimal-pad"
                                            value={draftAdditional.quantityUsed}
                                            onChangeText={(value) => setDraftAdditional(prev => prev ? { ...prev, quantityUsed: value } : null)}
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
                                            value={draftAdditional.additionalPrice}
                                            onChangeText={(value) => setDraftAdditional(prev => prev ? { ...prev, additionalPrice: value } : null)}
                                            style={styles.input}
                                        />
                                    </View>
                                </View>
                            </View>
                        ) : null}

                        <View style={[styles.RowActions, { marginBottom: 8 }]}>
                            {!draftAdditional ? (
                                <ThemedButton variant="secondary" style={styles.smallBtn} label={t('productForm.addAdditionalIngredient')} onPress={handleAddAdditional} />
                            ) : (
                                <ThemedButton style={styles.smallBtn} label={t('productForm.saveAdditionalItems')} onPress={handleSaveAdditional} />
                            )}
                        </View>


                        {/* Lista Consolidada de Adicionales */}
                        {additionalItems.length === 0 && !draftAdditional ? (
                            <ThemedText style={styles.smallLabel}>{t('productForm.addAdditionalHelp')}</ThemedText>
                        ) : additionalItems.map((item) => {
                            const ingredient = getIngredient(item.ingredientId);
                            if (!ingredient) return null;
                            return (
                                <View key={`additional-${item.ingredientId}`} style={[styles.ListItem, { borderColor: palette.border, marginBottom: 4 }]}>
                                    <View style={styles.flex1}>
                                        <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>{ingredient.name}</ThemedText>
                                        <ThemedText style={styles.smallLabel}>{item.quantityUsed} {ingredient.unit} · +${Number(item.additionalPrice).toFixed(2)}</ThemedText>
                                    </View>
                                    <Pressable hitSlop={8} onPress={() => setAdditionalItems(items => items.filter(i => i.ingredientId !== item.ingredientId))}>
                                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                ) : null}
            </ScrollView>

            <View style={[styles.Footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
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
    Header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    HeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    Content: {
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
    ListItem: {
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
    RowActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    smallBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    ImageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    ImageThumb: {
        width: 56,
        height: 56,
        borderRadius: 8,
    },
    Footer: {
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