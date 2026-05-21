import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ReceiptPreview } from '@/components/receipt-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { ReceiptData } from '@/types/receipt';
import type { Sale } from '@/types/types';

import type { ReceiptVariant } from './types';

type OrderReceiptViewProps = {
    sale: Sale;
    receiptData: ReceiptData | null;
    receiptVariants: ReceiptVariant[];
    receiptMessage: string | null;
    loading: boolean;
    printingBusy: boolean;
    fromPayment: boolean;
    onBack: () => void;
    onPrint: (receipt?: ReceiptData) => void;
};

export function OrderReceiptView({
    sale,
    receiptData,
    receiptVariants,
    receiptMessage,
    loading,
    printingBusy,
    fromPayment,
    onBack,
    onPrint,
}: OrderReceiptViewProps) {
    const palette = useAppColors();

    return (
        <>
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <Pressable style={styles.backButton} onPress={onBack}>
                    <ThemedText type="defaultSemiBold">{fromPayment ? '< Cerrar' : `< ${t('common.back')}`}</ThemedText>
                </Pressable>
                <ThemedText type="subtitle">{`${t('sales.receipt.title')} #${sale.id.slice(0, 6)}`}</ThemedText>
                <View style={styles.headerRightSpacer} />
            </View>

            <View style={styles.receiptBodyContainer}>
                <ScrollView style={styles.body} contentContainerStyle={styles.receiptPaperContainer} showsVerticalScrollIndicator={false}>
                    {loading ? <ThemedText style={styles.smallText}>{t('sales.receipt.loading')}</ThemedText> : null}

                    {!loading && receiptVariants.length > 1
                        ? receiptVariants.filter((v) => v.id !== 'full').map((variant) => (
                            <View key={variant.id} style={styles.partialReceiptBlock}>
                                <View style={styles.partialReceiptHeader}>
                                    <ThemedText style={styles.partialReceiptLabel}>{variant.label}</ThemedText>
                                    <ThemedButton
                                        label={printingBusy ? `${t('sales.action.printReceipt')}...` : t('sales.action.printReceipt')}
                                        disabled={printingBusy || loading}
                                        style={styles.partialPrintButton}
                                        onPress={() => onPrint(variant.receipt)}
                                    />
                                </View>
                                <View style={styles.receiptPaper}>
                                    <ReceiptPreview receipt={variant.receipt} />
                                    <View style={styles.receiptPaperTear}>
                                        {Array.from({ length: 24 }).map((_, index) => (
                                            <View key={index} style={styles.tearTooth} />
                                        ))}
                                    </View>
                                </View>
                            </View>
                        ))
                        : !loading
                            ? (
                                <View style={styles.receiptPaper}>
                                    {receiptData ? <ReceiptPreview receipt={receiptData} /> : null}
                                    <View style={styles.receiptPaperTear}>
                                        {Array.from({ length: 24 }).map((_, index) => (
                                            <View key={index} style={styles.tearTooth} />
                                        ))}
                                    </View>
                                </View>
                            )
                            : null
                    }

                    {receiptMessage ? (
                        <ThemedText style={[styles.smallText, { color: palette.danger }]}>{receiptMessage}</ThemedText>
                    ) : null}
                </ScrollView>
            </View>

            {receiptVariants.length <= 1 ? (
                <View style={[styles.footer, { borderTopColor: palette.border }]}>
                    <ThemedButton
                        label={printingBusy ? `${t('sales.action.printReceipt')}...` : t('sales.action.printReceipt')}
                        disabled={!receiptData || printingBusy || loading}
                        onPress={() => onPrint()}
                    />
                </View>
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        minHeight: 58,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    backButton: {
        minWidth: 82,
    },
    headerRightSpacer: {
        width: 24,
    },
    body: {
        flex: 1,
    },
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: 12,
        gap: 12,
    },
    smallText: {
        opacity: 0.8,
        fontSize: 13,
    },
    receiptBodyContainer: {
        flex: 1,
        backgroundColor: '#EAEAEA',
    },
    receiptPaperContainer: {
        padding: 16,
        gap: 10,
    },
    receiptPaper: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        overflow: 'hidden',
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
            : {
                elevation: 4,
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
            }),
    },
    receiptPaperTear: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 2,
        paddingBottom: 2,
    },
    tearTooth: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#EAEAEA',
    },
    partialReceiptBlock: {
        gap: 6,
    },
    partialReceiptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    partialReceiptLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    partialPrintButton: {
        minWidth: 0,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
});
