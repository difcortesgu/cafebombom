import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DiscountForm, type DiscountScope } from '@/components/operations/discount-form';
import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { Discount } from '@/types/types';

type DiscountPanelFormProps = {
    onClose: () => void;
    initialScope?: DiscountScope;
    discount?: Discount;
};

export function DiscountPanelForm({ onClose, initialScope = 'global', discount }: DiscountPanelFormProps) {
    const palette = useAppColors();
    const scope = discount?.scope ?? initialScope;

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="pricetag-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">
                        {scope === 'product' ? t('products.discounts.titleProduct') : t('products.discounts.titleGlobal')}
                    </ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                <DiscountForm onClose={onClose} initialScope={initialScope} discount={discount} />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    panelHeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    closeButton: {
        padding: 4,
    },
    panelContent: {
        padding: 20,
        gap: 16,
    },
});
