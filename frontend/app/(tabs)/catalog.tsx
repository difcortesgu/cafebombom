import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SlidePanelShell } from '@/components/ui/slide-panel';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

type Section = 'products' | 'ingredients' | 'suppliers';

type PanelMode =
    | { type: 'product-edit'; productId: string }
    | { type: 'ingredient-create' }
    | { type: 'ingredient-edit'; ingredientId: string }
    | { type: 'supplier-create' }
    | { type: 'supplier-edit'; supplierId: string };

const GRID_GAP = 12;
const PADDING = 16;

function getColumns(width: number) {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
}

export default function CatalogScreen() {
    const palette = useAppColors();
    const router = useRouter();
    const { width: screenWidth } = useWindowDimensions();
    const isWide = screenWidth >= 768;

    const [section, setSection] = useState<Section>('products');

    const {
        suppliers,
        ingredients,
        units,
        hydrate: hydrateInventory,
        addIngredient,
        addUnit,
        deleteUnit,
        updateIngredient,
        addSupplier,
        updateSupplier,
    } = useInventoryStore();
    const { products, categories, hydrate: hydrateProducts, updateProduct, addCategory, productIngredients, productAdditionalIngredients, setProductIngredient, removeProductIngredient, setProductAdditionalIngredient, removeProductAdditionalIngredient } = useProductsStore();

    // Panel state
    const [panelMode, setPanelMode] = useState<PanelMode | null>(null);
    const [panelVisible, setPanelVisible] = useState(false);
    const [panelMounted, setPanelMounted] = useState(false);

    const panelWidth = Math.min(Math.floor(screenWidth * 0.4), 520);

    // Panel form state
    const [ingredientForm, setIngredientForm] = useState({ name: '', unit: '', lowStockThreshold: '5' });
    const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', notes: '' });
    const [productForm, setProductForm] = useState({ name: '', price: '', categoryId: null as string | null, imageUri: null as string | null });
    const [productPanelRecipeItem, setProductPanelRecipeItem] = useState<{ ingredientId: string; quantityUsed: string } | null>(null);
    const [productPanelAdditionalItem, setProductPanelAdditionalItem] = useState<{ ingredientId: string; quantityUsed: string; additionalPrice: string } | null>(null);
    const [productSections, setProductSections] = useState({ general: true, recipe: false, additional: false });
    const [panelMessage, setPanelMessage] = useState('');

    const unitOptions = useMemo(
        () => units.map((u) => ({ value: u.name, label: u.name })),
        [units],
    );
    const categoryOptions = useMemo(
        () => [
            { value: '', label: t('productForm.none') },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
        ],
        [categories],
    );

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrateInventory(), hydrateProducts()]);
        }, [hydrateInventory, hydrateProducts]),
    );

    function openPanel(mode: PanelMode) {
        setPanelMessage('');
        setPanelMode(mode);
        setPanelMounted(true);
        setPanelVisible(true);

        if (mode.type === 'ingredient-create') {
            setIngredientForm({ name: '', unit: units[0]?.name ?? '', lowStockThreshold: '5' });
        } else if (mode.type === 'ingredient-edit') {
            const item = ingredients.find((i) => i.id === mode.ingredientId);
            if (item) setIngredientForm({ name: item.name, unit: item.unit, lowStockThreshold: String(item.low_stock_threshold) });
        } else if (mode.type === 'supplier-create') {
            setSupplierForm({ name: '', phone: '', notes: '' });
        } else if (mode.type === 'supplier-edit') {
            const item = suppliers.find((s) => s.id === mode.supplierId);
            if (item) setSupplierForm({ name: item.name, phone: item.phone ?? '', notes: item.notes ?? '' });
        } else if (mode.type === 'product-edit') {
            const item = products.find((p) => p.id === mode.productId);
            if (item) setProductForm({ name: item.name, price: String(item.price), categoryId: item.categoryId, imageUri: item.imageUri ?? null });
            setProductPanelRecipeItem(null);
            setProductPanelAdditionalItem(null);
            setProductSections({ general: true, recipe: false, additional: false });
        }
    }

    function closePanel() {
        setPanelVisible(false);
    }

    function handlePanelExited() {
        setPanelMounted(false);
    }

    async function submitIngredient() {
        if (!ingredientForm.name.trim()) { setPanelMessage(t('ingredientForm.error.nameRequired')); return; }
        if (!ingredientForm.unit.trim()) { setPanelMessage(t('ingredientForm.error.unitRequired')); return; }
        const payload = {
            name: ingredientForm.name.trim(),
            unit: ingredientForm.unit as any,
            lowStockThreshold: Number(ingredientForm.lowStockThreshold || '0'),
        };
        if (panelMode?.type === 'ingredient-edit') {
            await updateIngredient({ id: panelMode.ingredientId, ...payload });
        } else {
            await addIngredient(payload);
        }
        closePanel();
    }

    async function submitSupplier() {
        if (!supplierForm.name.trim()) { setPanelMessage(t('inventoryForm.suppliers.required')); return; }
        if (panelMode?.type === 'supplier-edit') {
            await updateSupplier({
                id: panelMode.supplierId,
                name: supplierForm.name.trim(),
                phone: supplierForm.phone.trim() || null,
                notes: supplierForm.notes.trim() || null,
            });
        } else {
            await addSupplier({ name: supplierForm.name.trim(), phone: supplierForm.phone.trim() || undefined, notes: supplierForm.notes.trim() || undefined });
        }
        closePanel();
    }

    async function submitProduct() {
        if (!productForm.name.trim()) { setPanelMessage(t('productForm.error.nameRequired')); return; }
        const price = Number(productForm.price || '0');
        if (price <= 0) { setPanelMessage(t('productForm.error.pricePositive')); return; }
        if (panelMode?.type === 'product-edit') {
            await updateProduct({ id: panelMode.productId, name: productForm.name.trim(), price, categoryId: productForm.categoryId, imageUri: productForm.imageUri });
        }
        closePanel();
    }

    async function saveProductPanelRecipe() {
        if (panelMode?.type !== 'product-edit' || !productPanelRecipeItem) return;
        const productId = panelMode.productId;
        const item = productPanelRecipeItem;
        if (!item.ingredientId || Number(item.quantityUsed || '0') <= 0) {
            setPanelMessage(t('productForm.error.recipeItemInvalid'));
            return;
        }
        await setProductIngredient({ productId, ingredientId: item.ingredientId, quantityUsed: Number(item.quantityUsed) });
        setProductPanelRecipeItem(null);
        setPanelMessage('');
    }

    async function saveProductPanelAdditional() {
        if (panelMode?.type !== 'product-edit' || !productPanelAdditionalItem) return;
        const productId = panelMode.productId;
        const item = productPanelAdditionalItem;
        if (!item.ingredientId || Number(item.quantityUsed || '0') <= 0 || Number(item.additionalPrice || '0') < 0) {
            setPanelMessage(t('productForm.error.additionalItemInvalid'));
            return;
        }
        await setProductAdditionalIngredient({ productId, ingredientId: item.ingredientId, quantityUsed: Number(item.quantityUsed), additionalPrice: Number(item.additionalPrice || '0') });
        setProductPanelAdditionalItem(null);
        setPanelMessage('');
    }

    async function pickProductPanelImage() {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            setProductForm((f) => ({ ...f, imageUri: result.assets[0].uri }));
        }
    }

    const numCols = getColumns(screenWidth);
    const cardWidth = (screenWidth - PADDING * 2 - GRID_GAP * (numCols - 1)) / numCols;

    return (
        <View style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.container}>
                <ThemedText type="title">{t('catalog.title')}</ThemedText>
                <ThemedText style={{ color: palette.mutedText }}>{t('catalog.subtitle')}</ThemedText>

                <View style={styles.tabRow}>
                    {(['products', 'ingredients', 'suppliers'] as Section[]).map((item) => (
                        <ThemedChip
                            key={item}
                            label={
                                item === 'products'
                                    ? t('products.tab.products')
                                    : item === 'ingredients'
                                        ? t('inventory.tab.ingredients')
                                        : t('inventory.tab.suppliers')
                            }
                            active={section === item}
                            onPress={() => setSection(item)}
                        />
                    ))}
                </View>

                <View style={styles.headerRow}>
                    <ThemedText type="subtitle">
                        {section === 'products'
                            ? t('products.list.title')
                            : section === 'ingredients'
                                ? t('products.ingredients.title')
                                : t('inventory.suppliers.list')}
                    </ThemedText>
                    <ThemedButton
                        icon="add"
                        label={
                            section === 'products'
                                ? t('products.list.add')
                                : section === 'ingredients'
                                    ? t('products.ingredients.add')
                                    : t('inventory.suppliers.add')
                        }
                        onPress={() => {
                            if (section === 'products') {
                                router.push('/product-form');
                            } else if (section === 'ingredients') {
                                if (isWide) openPanel({ type: 'ingredient-create' });
                                else router.push('/ingredient-form');
                            } else {
                                if (isWide) openPanel({ type: 'supplier-create' });
                                else router.push({ pathname: '/inventory-form', params: { section: 'suppliers' } });
                            }
                        }}
                    />
                </View>

                {/* Products grid */}
                {section === 'products' ? (
                    products.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                            <ThemedText style={{ color: palette.mutedText }}>{t('products.list.noCategory')}</ThemedText>
                        </View>
                    ) : (
                        <View style={[styles.grid, { gap: GRID_GAP }]}>
                            {products.map((product) => {
                                const categoryName = categories.find((c) => c.id === product.categoryId)?.name;
                                return (
                                    <View
                                        key={product.id}
                                        style={[
                                            styles.card,
                                            {
                                                width: cardWidth,
                                                backgroundColor: product.isActive ? palette.card : palette.inputBackground,
                                                borderColor: palette.border,
                                                opacity: product.isActive ? 1 : 0.7,
                                            },
                                        ]}
                                    >
                                        {product.imageUri ? (
                                            <Image source={{ uri: product.imageUri }} style={styles.productImage} resizeMode="cover" />
                                        ) : null}
                                        <View style={styles.cardHeader}>
                                            <ThemedText style={styles.cardName} numberOfLines={1}>{product.name}</ThemedText>
                                            <ThemedButton
                                                icon="pencil"
                                                variant="secondary"
                                                style={styles.editBtn}
                                                onPress={() => {
                                                    if (isWide) openPanel({ type: 'product-edit', productId: product.id });
                                                    else router.push({ pathname: '/product-form', params: { id: product.id } });
                                                }}
                                            />
                                        </View>
                                        <ThemedText style={[styles.productPrice, { color: palette.tint }]}>
                                            ${Number(product.price).toFixed(2)}
                                        </ThemedText>
                                        <View style={styles.tagRow}>
                                            {categoryName ? (
                                                <View style={[styles.tag, { backgroundColor: palette.tint + '22', borderColor: palette.tint + '44' }]}>
                                                    <ThemedText style={[styles.tagText, { color: palette.tint }]}>{categoryName}</ThemedText>
                                                </View>
                                            ) : null}
                                            <View style={[styles.tag, { backgroundColor: product.isActive ? palette.success + '22' : palette.mutedText + '22', borderColor: product.isActive ? palette.success + '44' : palette.mutedText + '44' }]}>
                                                <ThemedText style={[styles.tagText, { color: product.isActive ? palette.success : palette.mutedText }]}>
                                                    {product.isActive ? t('products.list.active') : t('products.list.archived')}
                                                </ThemedText>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )
                ) : null}

                {/* Ingredients grid */}
                {section === 'ingredients' ? (
                    ingredients.length === 0 ? (
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
                                const statusColor = isCritical ? palette.danger : isLow ? palette.accent : palette.success;
                                const cardBg = isCritical ? palette.danger + '18' : isLow ? palette.accent + '28' : palette.card;
                                const borderColor = isCritical ? palette.danger + '55' : isLow ? palette.accent + '88' : palette.border;
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
                                                onPress={() => {
                                                    if (isWide) openPanel({ type: 'ingredient-edit', ingredientId: ingredient.id });
                                                    else router.push({ pathname: '/ingredient-form', params: { id: ingredient.id } });
                                                }}
                                            />
                                        </View>
                                        <ThemedText style={[styles.qty, { color: palette.text }]}>
                                            {displayQty}{' '}
                                            <ThemedText style={[styles.unit, { color: palette.mutedText }]}>{ingredient.unit}</ThemedText>
                                        </ThemedText>
                                        <ThemedText style={[styles.threshold, { color: palette.mutedText }]}>
                                            {t('products.ingredients.threshold')}: {threshold} {ingredient.unit}
                                        </ThemedText>
                                        <View style={[styles.progressTrack, { backgroundColor: statusColor + '30' }]}>
                                            <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` as `${number}%`, backgroundColor: statusColor }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )
                ) : null}

                {/* Suppliers grid */}
                {section === 'suppliers' ? (
                    suppliers.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                            <ThemedText style={{ color: palette.mutedText }}>{t('inventory.suppliers.noNotes')}</ThemedText>
                        </View>
                    ) : (
                        <View style={[styles.grid, { gap: GRID_GAP }]}>
                            {suppliers.map((supplier) => (
                                <View key={supplier.id} style={[styles.card, { width: cardWidth, backgroundColor: palette.card, borderColor: palette.border }]}>
                                    <View style={styles.cardHeader}>
                                        <ThemedText style={styles.cardName} numberOfLines={1}>{supplier.name}</ThemedText>
                                        <ThemedButton
                                            icon="pencil"
                                            variant="secondary"
                                            style={styles.editBtn}
                                            onPress={() => {
                                                if (isWide) openPanel({ type: 'supplier-edit', supplierId: supplier.id });
                                                else router.push({ pathname: '/inventory-form', params: { section: 'suppliers' } });
                                            }}
                                        />
                                    </View>
                                    {supplier.phone ? (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="call-outline" size={13} color={palette.mutedText} />
                                            <ThemedText style={[styles.infoText, { color: palette.mutedText }]}>{supplier.phone}</ThemedText>
                                        </View>
                                    ) : null}
                                    {supplier.notes ? (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="document-text-outline" size={13} color={palette.mutedText} />
                                            <ThemedText style={[styles.infoText, { color: palette.mutedText }]} numberOfLines={2}>{supplier.notes}</ThemedText>
                                        </View>
                                    ) : null}
                                    {!supplier.phone && !supplier.notes ? (
                                        <ThemedText style={[styles.infoText, { color: palette.mutedText }]}>{t('inventory.suppliers.noNotes')}</ThemedText>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    )
                ) : null}
            </ScrollView>

            {/* Side panel */}
            {panelMounted ? (
                <SlidePanelShell
                    visible={panelVisible}
                    onClose={closePanel}
                    onExited={handlePanelExited}
                    width={panelWidth}
                    backdropStyle={styles.backdrop}
                    panelStyle={styles.panel}
                >
                    <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                        <View style={styles.panelHeaderTitle}>
                            <Ionicons
                                name={
                                    panelMode?.type === 'product-edit'
                                        ? 'storefront-outline'
                                        : panelMode?.type?.startsWith('ingredient')
                                            ? 'leaf-outline'
                                            : 'business-outline'
                                }
                                size={20}
                                color={palette.tint}
                            />
                            <ThemedText type="subtitle">
                                {panelMode?.type === 'product-edit'
                                    ? t('productForm.title.edit')
                                    : panelMode?.type === 'ingredient-create'
                                        ? t('ingredientForm.title.add')
                                        : panelMode?.type === 'ingredient-edit'
                                            ? t('ingredientForm.title.edit')
                                            : panelMode?.type === 'supplier-create'
                                                ? t('inventoryForm.suppliers.title')
                                                : t('catalog.panel.editSupplier')}
                            </ThemedText>
                        </View>
                        <Pressable style={styles.closeButton} onPress={closePanel} hitSlop={8}>
                            <Ionicons name="close" size={22} color={palette.text} />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                        {panelMessage ? (
                            <View style={[styles.messageBanner, { backgroundColor: palette.danger + '22', borderColor: palette.danger + '44' }]}>
                                <ThemedText style={{ color: palette.danger, fontSize: 13 }}>{panelMessage}</ThemedText>
                            </View>
                        ) : null}

                        {/* Ingredient form */}
                        {(panelMode?.type === 'ingredient-create' || panelMode?.type === 'ingredient-edit') ? (
                            <>
                                <View style={styles.fieldGroup}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                                        <ThemedText style={styles.smallLabel}>{t('ingredientForm.name')}</ThemedText>
                                    </View>
                                    <ThemedInput
                                        value={ingredientForm.name}
                                        onChangeText={(v) => setIngredientForm((f) => ({ ...f, name: v }))}
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.twoColRow}>
                                    <View style={styles.flex1}>
                                        <View style={styles.labelRow}>
                                            <Ionicons name="scale-outline" size={14} color={palette.mutedText} />
                                            <ThemedText style={styles.smallLabel}>{t('ingredientForm.unit')}</ThemedText>
                                        </View>
                                        <ThemedSelect
                                            value={ingredientForm.unit}
                                            onValueChange={(v) => setIngredientForm((f) => ({ ...f, unit: v }))}
                                            items={unitOptions}
                                            placeholder={t('ingredientForm.unit')}
                                            modalTitle={t('ingredientForm.unit')}
                                            canItemAction={() => true}
                                            onItemAction={async (item) => {
                                                const target = units.find((u) => u.name === item.value);
                                                if (!target) return;
                                                const error = await deleteUnit({ id: target.id });
                                                if (error) { setPanelMessage(error); return; }
                                                if (ingredientForm.unit === item.value) {
                                                    setIngredientForm((f) => ({ ...f, unit: units.find((u) => u.id !== target.id)?.name ?? '' }));
                                                }
                                                setPanelMessage('');
                                            }}
                                            onAddNew={async (name) => {
                                                const normalized = name.trim().toLowerCase();
                                                if (!normalized) { setPanelMessage(t('ingredientForm.error.newUnitRequired')); return; }
                                                const created = await addUnit({ name: normalized });
                                                if (!created) { setPanelMessage(t('ingredientForm.error.unitAlreadyExists')); return; }
                                                setIngredientForm((f) => ({ ...f, unit: created.name }));
                                                setPanelMessage('');
                                            }}
                                            addNewPlaceholder={t('ingredientForm.newUnitPlaceholder')}
                                        />
                                    </View>
                                    <View style={styles.flex1}>
                                        <View style={styles.labelRow}>
                                            <Ionicons name="alert-circle-outline" size={14} color={palette.mutedText} />
                                            <ThemedText style={styles.smallLabel}>{t('ingredientForm.lowStockThreshold')}</ThemedText>
                                        </View>
                                        <ThemedInput
                                            keyboardType="decimal-pad"
                                            value={ingredientForm.lowStockThreshold}
                                            onChangeText={(v) => setIngredientForm((f) => ({ ...f, lowStockThreshold: v }))}
                                            style={styles.input}
                                        />
                                    </View>
                                </View>
                            </>
                        ) : null}

                        {/* Supplier form */}
                        {(panelMode?.type === 'supplier-create' || panelMode?.type === 'supplier-edit') ? (
                            <>
                                <View style={styles.fieldGroup}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="business-outline" size={14} color={palette.mutedText} />
                                        <ThemedText style={styles.smallLabel}>{t('inventoryForm.suppliers.name')}</ThemedText>
                                    </View>
                                    <ThemedInput
                                        value={supplierForm.name}
                                        onChangeText={(v) => setSupplierForm((f) => ({ ...f, name: v }))}
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.fieldGroup}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="call-outline" size={14} color={palette.mutedText} />
                                        <ThemedText style={styles.smallLabel}>{t('inventoryForm.suppliers.phone')}</ThemedText>
                                    </View>
                                    <ThemedInput
                                        keyboardType="phone-pad"
                                        value={supplierForm.phone}
                                        onChangeText={(v) => setSupplierForm((f) => ({ ...f, phone: v }))}
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.fieldGroup}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="document-text-outline" size={14} color={palette.mutedText} />
                                        <ThemedText style={styles.smallLabel}>{t('inventoryForm.suppliers.notes')}</ThemedText>
                                    </View>
                                    <ThemedInput
                                        value={supplierForm.notes}
                                        onChangeText={(v) => setSupplierForm((f) => ({ ...f, notes: v }))}
                                        style={styles.input}
                                        multiline
                                    />
                                </View>
                            </>
                        ) : null}

                        {/* Product edit form */}
                        {panelMode?.type === 'product-edit' ? (
                            <>
                                {/* General section */}
                                <Pressable
                                    style={[styles.collapsibleHeader, { borderColor: palette.border }]}
                                    onPress={() => setProductSections((s) => ({ ...s, general: !s.general }))}
                                >
                                    <View style={styles.collapsibleHeaderLeft}>
                                        <Ionicons name="information-circle-outline" size={16} color={palette.tint} />
                                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.panel.sectionGeneral')}</ThemedText>
                                    </View>
                                    <Ionicons name={productSections.general ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                                </Pressable>
                                {productSections.general ? (
                                    <View style={styles.collapsibleContent}>
                                        <View style={styles.fieldGroup}>
                                            <View style={styles.labelRow}>
                                                <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                                                <ThemedText style={styles.smallLabel}>{t('productForm.name')}</ThemedText>
                                            </View>
                                            <ThemedInput
                                                value={productForm.name}
                                                onChangeText={(v) => setProductForm((f) => ({ ...f, name: v }))}
                                                style={styles.input}
                                            />
                                        </View>
                                        <View style={styles.fieldGroup}>
                                            <View style={styles.labelRow}>
                                                <Ionicons name="pricetag-outline" size={14} color={palette.mutedText} />
                                                <ThemedText style={styles.smallLabel}>{t('productForm.price')}</ThemedText>
                                            </View>
                                            <ThemedInput
                                                keyboardType="decimal-pad"
                                                value={productForm.price}
                                                onChangeText={(v) => setProductForm((f) => ({ ...f, price: v }))}
                                                style={styles.input}
                                            />
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
                                                <ThemedButton variant="secondary" style={styles.input} label={t('productForm.pickImage')} onPress={() => void pickProductPanelImage()} />
                                            )}
                                        </View>
                                    </View>
                                ) : null}

                                {/* Recipe section */}
                                <Pressable
                                    style={[styles.collapsibleHeader, { borderColor: palette.border }]}
                                    onPress={() => setProductSections((s) => ({ ...s, recipe: !s.recipe }))}
                                >
                                    <View style={styles.collapsibleHeaderLeft}>
                                        <Ionicons name="flask-outline" size={16} color={palette.tint} />
                                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.panel.sectionRecipe')}</ThemedText>
                                    </View>
                                    <Ionicons name={productSections.recipe ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                                </Pressable>
                                {productSections.recipe ? (
                                    <View style={styles.collapsibleContent}>
                                        {(() => {
                                            const recipeLinks = productIngredients.filter((link) => link.productId === panelMode.productId);
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
                                                            if (recipeLinks.length <= 1) { setPanelMessage(t('productForm.error.keepOneIngredient')); return; }
                                                            await removeProductIngredient({ productId: panelMode.productId, ingredientId: link.ingredientId });
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                                                    </Pressable>
                                                </View>
                                            ));
                                        })()}
                                        <ThemedText style={[styles.smallLabel, { marginTop: 8 }]}>{t('productForm.addRecipeIngredients')}</ThemedText>
                                        {productPanelRecipeItem ? (() => {
                                            const usedIds = (productIngredients.filter((l) => l.productId === panelMode.productId).map((l) => l.ingredientId));
                                            const available = ingredients.filter((ing) => !usedIds.includes(ing.id));
                                            return (
                                                <View style={[styles.ingredientCard, { borderColor: palette.tint + '66', backgroundColor: palette.inputBackground }]}>
                                                    <View style={styles.ingredientCardHeader}>
                                                        <View style={styles.labelRow}>
                                                            <Ionicons name="leaf-outline" size={13} color={palette.mutedText} />
                                                            <ThemedText style={styles.smallLabel}>{t('productForm.selectIngredient')}</ThemedText>
                                                        </View>
                                                        <Pressable hitSlop={8} onPress={() => setProductPanelRecipeItem(null)}>
                                                            <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
                                                        </Pressable>
                                                    </View>
                                                    <ThemedSelect
                                                        placeholder={t('productForm.selectIngredient')}
                                                        value={productPanelRecipeItem.ingredientId}
                                                        items={available.map((ing) => ({ label: ing.name, value: ing.id }))}
                                                        onValueChange={(v) => setProductPanelRecipeItem((it) => it ? { ...it, ingredientId: v } : it)}
                                                    />
                                                    <View style={styles.labelRow}>
                                                        <Ionicons name="scale-outline" size={13} color={palette.mutedText} />
                                                        <ThemedText style={styles.smallLabel}>{t('common.qtyShort')}</ThemedText>
                                                    </View>
                                                    <ThemedInput
                                                        placeholder="0"
                                                        keyboardType="decimal-pad"
                                                        value={productPanelRecipeItem.quantityUsed}
                                                        onChangeText={(v) => setProductPanelRecipeItem((it) => it ? { ...it, quantityUsed: v } : it)}
                                                        style={styles.input}
                                                    />
                                                    <ThemedButton style={styles.smallPanelBtn} label={t('productForm.saveRecipeItems')} onPress={() => void saveProductPanelRecipe()} />
                                                </View>
                                            );
                                        })() : (
                                            <ThemedButton variant="secondary" style={styles.smallPanelBtn} label={t('productForm.addIngredient')} onPress={() => setProductPanelRecipeItem({ ingredientId: '', quantityUsed: '' })} />
                                        )}
                                    </View>
                                ) : null}

                                {/* Additional section */}
                                <Pressable
                                    style={[styles.collapsibleHeader, { borderColor: palette.border }]}
                                    onPress={() => setProductSections((s) => ({ ...s, additional: !s.additional }))}
                                >
                                    <View style={styles.collapsibleHeaderLeft}>
                                        <Ionicons name="add-circle-outline" size={16} color={palette.tint} />
                                        <ThemedText type="defaultSemiBold" style={styles.collapsibleHeaderText}>{t('catalog.panel.sectionAdditional')}</ThemedText>
                                    </View>
                                    <Ionicons name={productSections.additional ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                                </Pressable>
                                {productSections.additional ? (
                                    <View style={styles.collapsibleContent}>
                                        {(() => {
                                            const additionalLinks = productAdditionalIngredients.filter((link) => link.productId === panelMode.productId);
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
                                                        onPress={async () => { await removeProductAdditionalIngredient({ productId: panelMode.productId, ingredientId: link.ingredientId }); }}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                                                    </Pressable>
                                                </View>
                                            ));
                                        })()}
                                        <ThemedText style={[styles.smallLabel, { marginTop: 8 }]}>{t('productForm.addAdditionalIngredients')}</ThemedText>
                                        {productPanelAdditionalItem ? (() => {
                                            const usedIds = (productAdditionalIngredients.filter((l) => l.productId === panelMode.productId).map((l) => l.ingredientId));
                                            const available = ingredients.filter((ing) => !usedIds.includes(ing.id));
                                            return (
                                                <View style={[styles.ingredientCard, { borderColor: palette.tint + '66', backgroundColor: palette.inputBackground }]}>
                                                    <View style={styles.ingredientCardHeader}>
                                                        <View style={styles.labelRow}>
                                                            <Ionicons name="leaf-outline" size={13} color={palette.mutedText} />
                                                            <ThemedText style={styles.smallLabel}>{t('productForm.selectIngredient')}</ThemedText>
                                                        </View>
                                                        <Pressable hitSlop={8} onPress={() => setProductPanelAdditionalItem(null)}>
                                                            <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
                                                        </Pressable>
                                                    </View>
                                                    <ThemedSelect
                                                        placeholder={t('productForm.selectIngredient')}
                                                        value={productPanelAdditionalItem.ingredientId}
                                                        items={available.map((ing) => ({ label: ing.name, value: ing.id }))}
                                                        onValueChange={(v) => setProductPanelAdditionalItem((it) => it ? { ...it, ingredientId: v } : it)}
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
                                                                value={productPanelAdditionalItem.quantityUsed}
                                                                onChangeText={(v) => setProductPanelAdditionalItem((it) => it ? { ...it, quantityUsed: v } : it)}
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
                                                                value={productPanelAdditionalItem.additionalPrice}
                                                                onChangeText={(v) => setProductPanelAdditionalItem((it) => it ? { ...it, additionalPrice: v } : it)}
                                                                style={styles.input}
                                                            />
                                                        </View>
                                                    </View>
                                                    <ThemedButton style={styles.smallPanelBtn} label={t('productForm.saveAdditionalItems')} onPress={() => void saveProductPanelAdditional()} />
                                                </View>
                                            );
                                        })() : (
                                            <ThemedButton variant="secondary" style={styles.smallPanelBtn} label={t('productForm.addAdditionalIngredient')} onPress={() => setProductPanelAdditionalItem({ ingredientId: '', quantityUsed: '', additionalPrice: '' })} />
                                        )}
                                    </View>
                                ) : null}
                            </>
                        ) : null}
                    </ScrollView>

                    <View style={[styles.panelFooter, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                        <ThemedButton
                            style={styles.saveButton}
                            label={t('inventoryForm.suppliers.save')}
                            icon="checkmark-circle"
                            onPress={() => {
                                if (panelMode?.type === 'ingredient-create' || panelMode?.type === 'ingredient-edit') void submitIngredient();
                                else if (panelMode?.type === 'supplier-create' || panelMode?.type === 'supplier-edit') void submitSupplier();
                                else if (panelMode?.type === 'product-edit') void submitProduct();
                            }}
                        />
                        <ThemedButton
                            variant="secondary"
                            label={t('common.back')}
                            onPress={closePanel}
                            style={styles.backButton}
                        />
                    </View>
                </SlidePanelShell>
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
    tabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
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
    productImage: {
        width: '100%',
        height: 90,
        borderRadius: 10,
        marginBottom: 2,
    },
    productPrice: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 28,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    tag: {
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
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
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    infoText: {
        fontSize: 12,
        flex: 1,
    },
    // Panel
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    panel: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        borderLeftWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
    },
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
    twoColRow: {
        flexDirection: 'row',
        gap: 10,
    },
    flex1: {
        flex: 1,
        gap: 6,
    },
    divider: {
        paddingTop: 14,
        borderTopWidth: 1,
        marginTop: 4,
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
    compactInput: {
        paddingHorizontal: 8,
        paddingVertical: 6,
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

