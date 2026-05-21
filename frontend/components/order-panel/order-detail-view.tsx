import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { SaleItemDetail, SalePricingSummary } from '@/types/sales';
import type { OrderStatus, RestaurantTable, Sale } from '@/types/types';
import { getSaleSurchargeLines } from '@/utils/surcharge';

type OrderDetailViewProps = {
    sale: Sale;
    items: SaleItemDetail[];
    pricing: SalePricingSummary | null;
    loading: boolean;
    actionBusy: boolean;
    tables: RestaurantTable[];
    toGoSurcharge: number;
    onClose: () => void;
    onNavigateToPayment: () => void;
    onNavigateToReceipt: () => void;
    onSendToKitchen: () => void;
    onMarkReady: () => void;
    onCancelOrder: () => void;
};

function formatStatusLabel(status: OrderStatus) {
    if (status === 'draft') return t('sales.status.draft');
    if (status === 'in-progress') return t('sales.status.inProgress');
    if (status === 'ready') return t('sales.status.ready');
    if (status === 'completed') return t('sales.status.completed');
    if (status === 'cancelled') return t('sales.status.cancelled');
    return status;
}

function getStatusTone(status: OrderStatus, palette: ReturnType<typeof useAppColors>) {
    if (status === 'completed') {
        return { backgroundColor: palette.tint, color: palette.card, borderColor: palette.tint };
    }
    if (status === 'ready') {
        return { backgroundColor: palette.accent, color: palette.background, borderColor: palette.accent };
    }
    if (status === 'cancelled') {
        return { backgroundColor: '#B71C1C', color: '#FFFFFF', borderColor: '#B71C1C' };
    }
    if (status === 'in-progress') {
        return { backgroundColor: '#1565C0', color: '#FFFFFF', borderColor: '#1565C0' };
    }
    return { backgroundColor: palette.border, color: palette.text, borderColor: palette.border };
}

function getPrimaryActionIcon(status: OrderStatus): keyof typeof Ionicons.glyphMap {
    if (status === 'draft') return 'flame-outline';
    if (status === 'in-progress') return 'checkmark-circle-outline';
    if (status === 'ready') return 'card-outline';
    return 'ellipsis-vertical';
}

export function OrderDetailView({
    sale,
    items,
    pricing,
    loading,
    actionBusy,
    tables,
    toGoSurcharge,
    onClose,
    onNavigateToPayment,
    onNavigateToReceipt,
    onSendToKitchen,
    onMarkReady,
    onCancelOrder,
}: OrderDetailViewProps) {
    const palette = useAppColors();
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);

    const statusTone = getStatusTone(sale.status, palette);
    const detailTotal = Number(pricing?.total ?? sale.total ?? 0);
    const isFinalState = sale.status === 'completed' || sale.status === 'cancelled';
    const isCompleted = sale.status === 'completed';

    const detailPrimaryAction = (() => {
        if (sale.status === 'completed' || sale.status === 'cancelled') {
            return { label: '', onPress: () => { }, visible: false };
        }
        if (sale.status === 'draft') {
            return { label: t('sales.action.sendToKitchen'), onPress: onSendToKitchen, visible: true };
        }
        if (sale.status === 'in-progress') {
            return { label: t('sales.action.markReady'), onPress: onMarkReady, visible: true };
        }
        if (sale.status === 'ready' && !sale.paid_at) {
            return { label: t('sales.action.receivePayment'), onPress: onNavigateToPayment, visible: true };
        }
        return { label: '', onPress: () => { }, visible: false };
    })();

    return (
        <>
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <View style={styles.headerLeft}>
                    <ThemedText type="subtitle">#{sale.id.slice(0, 6)}</ThemedText>
                    <View style={[styles.statusBadge, statusTone]}>
                        <ThemedText style={[styles.statusBadgeText, { color: statusTone.color }]}>
                            {formatStatusLabel(sale.status)}
                        </ThemedText>
                    </View>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.metaText}>
                    {sale.table_name} · {sale.staff_name} · {new Date(Number(sale.created_at) * 1000).toLocaleString()}
                </ThemedText>

                {loading ? (
                    <ThemedText style={styles.smallText}>{t('sales.loadingProducts')}</ThemedText>
                ) : (
                    <>
                        <View style={[styles.section, { borderColor: palette.border }]}>
                            {items.map((item) => (
                                <View key={item.id} style={styles.detailRow}>
                                    <ThemedText style={styles.detailRowLabel}>
                                        {item.product_name} x{item.quantity}
                                    </ThemedText>
                                    <ThemedText style={styles.detailRowValue}>
                                        ${Number(item.final_line_total).toFixed(2)}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>

                        {pricing && (
                            <View style={[styles.section, { borderColor: palette.border }]}>
                                <View style={styles.detailRow}>
                                    <ThemedText style={styles.detailRowLabel}>{t('sales.pricing.subtotal')}</ThemedText>
                                    <ThemedText style={styles.detailRowValue}>${Number(pricing.subtotal).toFixed(2)}</ThemedText>
                                </View>
                                {Number(pricing.item_discount_total) > 0 && (
                                    <View style={styles.detailRow}>
                                        <ThemedText style={styles.detailRowLabel}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                                        <ThemedText style={[styles.detailRowValue, { color: palette.danger }]}>
                                            -${Number(pricing.item_discount_total).toFixed(2)}
                                        </ThemedText>
                                    </View>
                                )}
                                {Number(pricing.global_discount_amount) > 0 && (
                                    <View style={styles.detailRow}>
                                        <ThemedText style={styles.detailRowLabel}>
                                            {pricing.global_discount_name ?? t('sales.pricing.globalDiscount')}
                                        </ThemedText>
                                        <ThemedText style={[styles.detailRowValue, { color: palette.danger }]}>
                                            -${Number(pricing.global_discount_amount).toFixed(2)}
                                        </ThemedText>
                                    </View>
                                )}
                                {getSaleSurchargeLines(pricing, sale.table_name, tables, toGoSurcharge).map((line) => (
                                    <ThemedText key={line} style={styles.detailRowLabel}>{line}</ThemedText>
                                ))}
                                <View style={[styles.detailRow, styles.totalRow, { borderTopColor: palette.border }]}>
                                    <ThemedText type="defaultSemiBold">{t('sales.pricing.finalTotal')}</ThemedText>
                                    <ThemedText type="defaultSemiBold">${Number(pricing.total).toFixed(2)}</ThemedText>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: palette.border }]}>
                <View style={styles.footerTotal}>
                    <ThemedText style={styles.totalLabel}>{t('sales.pricing.finalTotal')}</ThemedText>
                    <ThemedText style={styles.totalValue}>${detailTotal.toFixed(2)}</ThemedText>
                </View>

                <View style={styles.footerActions}>
                    {!isFinalState ? (
                        <>
                            {detailPrimaryAction.visible && (
                                <Pressable
                                    style={[styles.actionButton, styles.actionButtonPrimary, { borderColor: palette.tint, backgroundColor: palette.tint, opacity: actionBusy ? 0.6 : 1 }]}
                                    onPress={detailPrimaryAction.onPress}
                                >
                                    <Ionicons name={getPrimaryActionIcon(sale.status)} size={18} color={palette.card} />
                                    <ThemedText style={[styles.actionButtonLabel, { color: palette.card }]}>{detailPrimaryAction.label}</ThemedText>
                                </Pressable>
                            )}

                            {!sale.paid_at && sale.status !== 'ready' && (
                                <Pressable
                                    style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: palette.border, opacity: actionBusy ? 0.6 : 1 }]}
                                    onPress={() => !actionBusy && onNavigateToPayment()}
                                >
                                    <Ionicons name="card-outline" size={18} color={palette.mutedText} />
                                    <ThemedText style={[styles.actionButtonLabel, { color: palette.mutedText }]}>{t('sales.action.payNow')}</ThemedText>
                                </Pressable>
                            )}

                            {!sale.paid_at && (
                                <Pressable
                                    style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: palette.border, flex: 0, paddingHorizontal: 10 }]}
                                    onPress={() => router.push(`/sale-form?orderId=${sale.id}`)}
                                    accessibilityLabel="editar cuenta"
                                    accessibilityHint="editar cuenta"
                                    {...(Platform.OS === 'web' ? { title: 'editar cuenta' } : {})}
                                >
                                    <Ionicons name="create-outline" size={18} color={palette.mutedText} />
                                </Pressable>
                            )}

                            <Pressable
                                style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: palette.border, flex: 0, paddingHorizontal: 10 }]}
                                onPress={() => setMenuVisible((prev) => !prev)}
                            >
                                <Ionicons name="ellipsis-vertical" size={18} color={palette.mutedText} />
                            </Pressable>

                            {menuVisible && (
                                <View style={[styles.menu, { borderColor: palette.border, backgroundColor: palette.card }]}>
                                    <Pressable
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setMenuVisible(false);
                                            onCancelOrder();
                                        }}
                                    >
                                        <Ionicons name="close-circle-outline" size={16} color={palette.danger} />
                                        <ThemedText style={[styles.menuItemText, { color: palette.danger }]}>{t('sales.action.cancel')}</ThemedText>
                                    </Pressable>
                                    <Pressable
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setMenuVisible(false);
                                            onNavigateToReceipt();
                                        }}
                                    >
                                        <Ionicons name="receipt-outline" size={16} color={palette.tint} />
                                        <ThemedText style={[styles.menuItemText, { color: palette.tint }]}>{t('sales.action.previewReceipt')}</ThemedText>
                                    </Pressable>
                                </View>
                            )}
                        </>
                    ) : isCompleted ? (
                        <Pressable
                            style={[styles.actionButton, styles.actionButtonPrimary, { borderColor: palette.tint, backgroundColor: palette.tint, flex: 1 }]}
                            onPress={onNavigateToReceipt}
                        >
                            <Ionicons name="receipt-outline" size={18} color={palette.card} />
                            <ThemedText style={[styles.actionButtonLabel, { color: palette.card }]}>{t('sales.action.previewReceipt')}</ThemedText>
                        </Pressable>
                    ) : null}
                </View>
            </View>
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        padding: 12,
        gap: 10,
        paddingBottom: 24,
    },
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: 12,
        gap: 12,
    },
    footerTotal: {
        gap: 4,
        marginBottom: 4,
    },
    totalLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    footerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 40,
    },
    actionButtonPrimary: {
        borderWidth: 0,
    },
    actionButtonSecondary: {
        backgroundColor: 'transparent',
    },
    actionButtonLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    metaText: {
        fontSize: 13,
        opacity: 0.75,
    },
    section: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        padding: 10,
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    detailRowLabel: {
        fontSize: 13,
        flex: 1,
    },
    detailRowValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    totalRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        marginTop: 4,
        paddingTop: 6,
    },
    smallText: {
        opacity: 0.8,
        fontSize: 13,
    },
    menu: {
        position: 'absolute',
        right: 0,
        bottom: 50,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        minWidth: 200,
        overflow: 'hidden',
        zIndex: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
