import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { IngredientPanelForm } from '@/components/catalog/ingredient-panel-form';
import { IngredientsTab } from '@/components/catalog/ingredients-tab';
import { ProductPanelForm } from '@/components/catalog/product-panel-form';
import { ProductsTab } from '@/components/catalog/products-tab';
import { SupplierPanelForm } from '@/components/catalog/supplier-panel-form';
import { SuppliersTab } from '@/components/catalog/suppliers-tab';
import { ThemedText } from '@/components/themed-text';
import { SlidePanelShell } from '@/components/ui/slide-panel';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useCatalogGrid } from '@/hooks/use-catalog-grid';
import { usePanelLifecycle } from '@/hooks/use-panel-lifecycle';
import { useResponsiveOpen } from '@/hooks/use-responsive-open';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

type Section = 'products' | 'ingredients' | 'suppliers';

type PanelMode =
    | { type: 'product-create' }
    | { type: 'product-edit'; productId: string }
    | { type: 'ingredient-create' }
    | { type: 'ingredient-edit'; ingredientId: string }
    | { type: 'supplier-create' }
    | { type: 'supplier-edit'; supplierId: string };

const GRID_GAP = 12;
const PADDING = 16;

export default function CatalogScreen() {
    const palette = useAppColors();
    const { screenWidth, numCols, cardWidth } = useCatalogGrid();
    const { isWide, openOrNavigate } = useResponsiveOpen();

    const [section, setSection] = useState<Section>('products');

    const { suppliers, ingredients, hydrate: hydrateInventory } = useInventoryStore();
    const { products, categories, hydrate: hydrateProducts } = useProductsStore();

    // Panel state
    const panel = usePanelLifecycle();
    const [panelMode, setPanelMode] = useState<PanelMode | null>(null);

    const panelWidth = Math.min(Math.floor(screenWidth * 0.4), 520);

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrateInventory(), hydrateProducts()]);
        }, [hydrateInventory, hydrateProducts]),
    );

    function openPanel(mode: PanelMode) {
        setPanelMode(mode);
        panel.open();
    }

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
                                openOrNavigate(() => openPanel({ type: 'product-create' }), '/product-form');
                            } else if (section === 'ingredients') {
                                openOrNavigate(() => openPanel({ type: 'ingredient-create' }), '/ingredient-form');
                            } else {
                                openOrNavigate(() => openPanel({ type: 'supplier-create' }), { pathname: '/inventory-form', params: { section: 'suppliers' } });
                            }
                        }}
                    />
                </View>

                {/* Tab content */}
                {section === 'products' ? (
                    <ProductsTab
                        products={products}
                        categories={categories}
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        palette={palette}
                        onEditProduct={(productId) => openOrNavigate(
                            () => openPanel({ type: 'product-edit', productId }),
                            { pathname: '/product-form', params: { id: productId } },
                        )}
                    />
                ) : null}

                {section === 'ingredients' ? (
                    <IngredientsTab
                        ingredients={ingredients}
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        palette={palette}
                        onEditIngredient={(ingredientId) => openOrNavigate(
                            () => openPanel({ type: 'ingredient-edit', ingredientId }),
                            { pathname: '/ingredient-form', params: { id: ingredientId } },
                        )}
                    />
                ) : null}

                {section === 'suppliers' ? (
                    <SuppliersTab
                        suppliers={suppliers}
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        palette={palette}
                        onEditSupplier={(supplierId) => openOrNavigate(
                            () => openPanel({ type: 'supplier-edit', supplierId }),
                            { pathname: '/inventory-form', params: { section: 'suppliers' } },
                        )}
                    />
                ) : null}
            </ScrollView>

            {/* Side panel */}
            {panel.mounted ? (
                <SlidePanelShell
                    visible={panel.visible}
                    onClose={panel.close}
                    onExited={panel.onExited}
                    width={panelWidth}
                    backdropStyle={styles.backdrop}
                    panelStyle={styles.panel}
                >
                    {panelMode?.type === 'ingredient-create' ? (
                        <IngredientPanelForm mode="create" onClose={panel.close} />
                    ) : panelMode?.type === 'ingredient-edit' ? (
                        <IngredientPanelForm mode={{ ingredientId: panelMode.ingredientId }} onClose={panel.close} />
                    ) : panelMode?.type === 'supplier-create' ? (
                        <SupplierPanelForm mode="create" onClose={panel.close} />
                    ) : panelMode?.type === 'supplier-edit' ? (
                        <SupplierPanelForm mode={{ supplierId: panelMode.supplierId }} onClose={panel.close} />
                    ) : panelMode?.type === 'product-create' ? (
                        <ProductPanelForm mode="create" onClose={panel.close} />
                    ) : panelMode?.type === 'product-edit' ? (
                        <ProductPanelForm mode={{ productId: panelMode.productId }} onClose={panel.close} />
                    ) : null}
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
});

