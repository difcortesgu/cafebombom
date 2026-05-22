import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { t } from '@/i18n';
import type { CategoryOption, ProductDetail } from '@/types/products';

type ProductsTabProps = {
    products: ProductDetail[];
    categories: CategoryOption[];
    cardWidth: number;
    gap: number;
    palette: {
        card: string;
        inputBackground: string;
        border: string;
        mutedText: string;
        tint: string;
        success: string;
    };
    onEditProduct: (productId: string) => void;
};

export function ProductsTab({
    products,
    categories,
    cardWidth,
    gap,
    palette,
    onEditProduct,
}: ProductsTabProps) {
    if (products.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('products.list.noCategory')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]}>
            {products.map((product) => {
                const categoryName = categories.find((category) => category.id === product.categoryId)?.name;

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
                                onPress={() => onEditProduct(product.id)}
                            />
                        </View>
                        <ThemedText style={[styles.productPrice, { color: palette.tint }]}>${Number(product.price).toFixed(2)}</ThemedText>
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
});
