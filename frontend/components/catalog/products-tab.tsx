import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { t } from '@/i18n';
import type { CategoryOption, ProductDetail } from '@/types/products';
import { money } from '@/utils/money';

type ProductsTabProps = {
    products: ProductDetail[];
    categories: CategoryOption[];
    gap: number;
    palette: {
        card: string;
        inputBackground: string;
        border: string;
        mutedText: string;
        tint: string;
        accent: string;
        success: string;
        warning: string;
        danger: string;
    };
    onEditProduct: (productId: string) => void;
    onDeleteProduct: (productId: string) => void;
    onToggleProductActive: (productId: string, isActive: boolean) => void;
};

export function ProductsTab({
    products,
    categories,
    gap,
    palette,
    onEditProduct,
    onDeleteProduct,
    onToggleProductActive,
}: ProductsTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);

    if (products.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('products.list.noCategory')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]} onLayout={onLayout}>
            {products.map((product) => {
                const categoryName = categories.find((category) => category.id === product.categoryId)?.name;

                return (
                    <EntityCard
                        key={product.id}
                        width={cardWidth}
                        title={product.name}
                        style={{
                            backgroundColor: product.isActive ? palette.card : palette.inputBackground,
                            borderColor: product.isCombo ? palette.accent : palette.border,
                            opacity: product.isActive ? 1 : 0.7,
                        }}
                        media={product.imageUri ? (
                            <Image source={{ uri: product.imageUri }} style={styles.productImage} resizeMode="cover" />
                        ) : undefined}
                        titleTrailing={product.isCombo ? (
                            <Ionicons name="layers-outline" size={14} color={palette.accent} />
                        ) : undefined}
                        info={(
                            <>
                                <ThemedText style={[styles.productPrice, { color: palette.tint }]}>{money(product.price)}</ThemedText>
                                <View style={styles.tagRow}>
                                    {categoryName ? (
                                        <View style={[styles.tag, { backgroundColor: `${palette.tint}22`, borderColor: `${palette.tint}44` }]}>
                                            <ThemedText style={[styles.tagText, { color: palette.tint }]}>{categoryName}</ThemedText>
                                        </View>
                                    ) : null}
                                    <View
                                        style={[
                                            styles.tag,
                                            {
                                                backgroundColor: product.isActive ? `${palette.success}22` : `${palette.mutedText}22`,
                                                borderColor: product.isActive ? `${palette.success}44` : `${palette.mutedText}44`,
                                            },
                                        ]}
                                    >
                                        <ThemedText style={[styles.tagText, { color: product.isActive ? palette.success : palette.mutedText }]}>
                                            {product.isActive ? t('products.list.active') : t('products.list.archived')}
                                        </ThemedText>
                                    </View>
                                </View>
                            </>
                        )}
                        actions={[
                            {
                                icon: 'create-outline',
                                label: t('products.list.edit'),
                                onPress: () => onEditProduct(product.id),
                            },
                            {
                                icon: product.isActive ? 'pause-circle-outline' : 'checkmark-circle-outline',
                                label: product.isActive ? t('common.disable') : t('common.enable'),
                                tone: product.isActive ? 'warning' : 'success',
                                onPress: () => onToggleProductActive(product.id, product.isActive),
                            },
                            {
                                icon: 'trash-outline',
                                label: t('common.delete'),
                                tone: 'danger',
                                collapseOnNarrow: true,
                                onPress: () => onDeleteProduct(product.id),
                            },
                        ]}
                    />
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
    productImage: {
        width: '100%',
        height: 90,
        borderRadius: 10,
        marginBottom: 2,
    },
    productPrice: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 26,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
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
});
