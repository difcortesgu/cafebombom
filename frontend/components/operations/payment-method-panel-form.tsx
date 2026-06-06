import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PaymentMethodForm } from '@/components/operations/payment-method-form';
import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';

type PaymentMethodPanelFormProps = {
    onClose: () => void;
    method?: { id: string; name: string; icon: string; is_active: boolean };
};

export function PaymentMethodPanelForm({ onClose, method }: PaymentMethodPanelFormProps) {
    const palette = useAppColors();

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="card-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">{method ? t('products.list.edit') : t('settings.paymentMethods.add')}</ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                <PaymentMethodForm onClose={onClose} method={method} />
            </ScrollView>
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
});
