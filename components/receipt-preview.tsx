import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { ReceiptData } from '@/types/receipt';
import { formatCurrency } from '@/utils/receipt-formatter';

type ReceiptPreviewProps = {
  receipt: ReceiptData;
};

function paymentMethodLabel(method: string | null): string {
  if (!method) {
    return '';
  }
  if (method === 'card') {
    return t('sales.payment.card');
  }
  if (method === 'transfer') {
    return t('sales.payment.transfer');
  }
  return t('sales.payment.cash');
}

export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const palette = useAppColors();
  const width = receipt.paperWidth === 58 ? 280 : 360;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <ThemedView style={[styles.paper, { width, borderColor: palette.border, backgroundColor: palette.card }]}>
        {receipt.business.logoUri ? <Image source={{ uri: receipt.business.logoUri }} style={styles.logo} resizeMode="contain" /> : null}
        <ThemedText style={styles.centerTitle}>{receipt.business.name || 'CafeBomBom'}</ThemedText>
        {receipt.business.address ? <ThemedText style={styles.centerText}>{receipt.business.address}</ThemedText> : null}
        {receipt.business.phone ? <ThemedText style={styles.centerText}>{t('sales.receipt.phonePrefix')}: {receipt.business.phone}</ThemedText> : null}

        <View style={[styles.separator, { borderBottomColor: palette.border }]} />

        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.orderLabel')}</ThemedText><ThemedText style={styles.value}>#{receipt.metadata.orderShortId}</ThemedText></View>
        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.dateLabel')}</ThemedText><ThemedText style={styles.value}>{new Date(receipt.metadata.createdAt * 1000).toLocaleString('es-CO')}</ThemedText></View>
        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.staffLabel')}</ThemedText><ThemedText style={styles.value}>{receipt.metadata.staffName}</ThemedText></View>
        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.tableLabel')}</ThemedText><ThemedText style={styles.value}>{receipt.metadata.tableName}</ThemedText></View>
        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.paymentLabel')}</ThemedText><ThemedText style={styles.value}>{paymentMethodLabel(receipt.metadata.paymentMethod)}</ThemedText></View>

        <View style={[styles.separator, { borderBottomColor: palette.border }]} />

        {receipt.items.map((item) => (
          <View key={item.id} style={styles.itemWrap}>
            <View style={styles.row}>
              <ThemedText style={[styles.value, styles.itemName]}>{item.name}</ThemedText>
              <ThemedText style={styles.value}>{formatCurrency(item.lineTotal)}</ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText style={styles.metaText}>{item.quantity} x {formatCurrency(item.unitPrice)}</ThemedText>
              {item.discountAmount > 0 ? <ThemedText style={styles.metaText}>-{formatCurrency(item.discountAmount)}</ThemedText> : null}
            </View>
          </View>
        ))}

        <View style={[styles.separator, { borderBottomColor: palette.border }]} />

        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.subtotalLabel')}</ThemedText><ThemedText style={styles.value}>{formatCurrency(receipt.pricing.subtotal)}</ThemedText></View>
        {receipt.pricing.itemDiscountTotal > 0 ? (
          <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.itemDiscountLabel')}</ThemedText><ThemedText style={styles.value}>-{formatCurrency(receipt.pricing.itemDiscountTotal)}</ThemedText></View>
        ) : null}
        {receipt.pricing.globalDiscountAmount > 0 ? (
          <View style={styles.row}><ThemedText style={styles.label}>{receipt.pricing.globalDiscountName || t('sales.receipt.globalDiscountLabel')}</ThemedText><ThemedText style={styles.value}>-{formatCurrency(receipt.pricing.globalDiscountAmount)}</ThemedText></View>
        ) : null}
        {receipt.pricing.surchargeBreakdown.length > 0
          ? receipt.pricing.surchargeBreakdown.map((line) => {
            const label = line.description ? `${line.label} (${line.description})` : line.label;
            return (
              <View key={`${line.label}-${line.amount}`} style={styles.row}>
                <ThemedText style={styles.label}>{label}</ThemedText>
                <ThemedText style={styles.value}>{formatCurrency(line.amount)}</ThemedText>
              </View>
            );
          })
          : receipt.pricing.orderTypeSurcharge > 0 ? (
            <View style={styles.row}><ThemedText style={styles.label}>{t('sales.surcharge.generic')}</ThemedText><ThemedText style={styles.value}>{formatCurrency(receipt.pricing.orderTypeSurcharge)}</ThemedText></View>
          ) : null}

        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.taxInclusiveLabel', { label: receipt.pricing.taxLabel, rate: (receipt.pricing.taxRate * 100).toFixed(0) })}</ThemedText><ThemedText style={styles.value}>{formatCurrency(receipt.pricing.taxAmount)}</ThemedText></View>
        <View style={styles.row}><ThemedText style={styles.label}>{t('sales.receipt.preTaxTotalLabel')}</ThemedText><ThemedText style={styles.value}>{formatCurrency(receipt.pricing.preTaxTotal)}</ThemedText></View>
        <View style={styles.row}><ThemedText style={styles.totalLabel}>{t('sales.receipt.totalLabel')}</ThemedText><ThemedText style={styles.totalValue}>{formatCurrency(receipt.pricing.total)}</ThemedText></View>

        {receipt.business.footerMessage ? (
          <>
            <View style={[styles.separator, { borderBottomColor: palette.border }]} />
            <ThemedText style={styles.centerText}>{receipt.business.footerMessage}</ThemedText>
          </>
        ) : null}

        {receipt.qrCodeData ? <ThemedText style={styles.centerText}>{t('sales.receipt.qrLabel')}: {receipt.qrCodeData}</ThemedText> : null}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 480,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  paper: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  logo: {
    width: '100%',
    height: 70,
    marginBottom: 4,
  },
  centerTitle: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  centerText: {
    textAlign: 'center',
    fontSize: 13,
  },
  separator: {
    borderBottomWidth: 1,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemWrap: {
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    opacity: 0.85,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  itemName: {
    flex: 1,
    textAlign: 'left',
  },
  metaText: {
    fontSize: 12,
    opacity: 0.8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
