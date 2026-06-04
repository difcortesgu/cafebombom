import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { OrderPanel } from '@/components/order-panel';
import { ThemedText } from '@/components/themed-text';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';

export default function SaleDetailScreen() {
    const router = useRouter();
    const { saleId } = useLocalSearchParams<{ saleId: string }>();

    const { hydrate, sales } = useSalesStore();
    const {
        businessName,
        businessAddress,
        businessPhone,
        businessNit,
        businessLogoUri,
        businessLogoPreviewUrl,
        businessLogoRaster58Url,
        businessLogoRaster80Url,
        receiptFooterMessage,
        printerPaperWidth,
        taxRate,
        printerDeviceName,
        printerDeviceAddress,
    } = useSettingsStore();

    useFocusEffect(
        useCallback(() => {
            void hydrate();
        }, [hydrate]),
    );

    const sale = sales.find((s) => s.id === saleId) ?? null;

    if (!sale) {
        return (
            <View style={styles.container}>
                <ThemedText>Orden no encontrada.</ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <OrderPanel
                standalone
                visible
                sale={sale}
                onClose={() => router.back()}
                onExited={() => router.back()}
                business={{
                    name: businessName,
                    address: businessAddress,
                    phone: businessPhone,
                    nit: businessNit,
                    logoUri: businessLogoPreviewUrl ?? businessLogoUri,
                    logoRasterUrl: printerPaperWidth === 58 ? businessLogoRaster58Url : businessLogoRaster80Url,
                    footerMessage: receiptFooterMessage,
                    taxRate,
                    paperWidth: printerPaperWidth,
                    printerDeviceName,
                    printerDeviceAddress,
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
