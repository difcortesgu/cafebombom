import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { t } from '@/i18n';

type SupplierListItem = {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
    is_active: boolean;
};

type SuppliersTabProps = {
    suppliers: SupplierListItem[];
    cardWidth: number;
    gap: number;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        inputBackground: string;
        danger: string;
        success: string;
    };
    onEditSupplier: (supplierId: string) => void;
    onDeleteSupplier: (supplierId: string) => void;
    onToggleSupplierActive: (supplierId: string, isActive: boolean) => void;
};

export function SuppliersTab({ suppliers, cardWidth, gap, palette, onEditSupplier, onDeleteSupplier, onToggleSupplierActive }: SuppliersTabProps) {
    if (suppliers.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('inventory.suppliers.noNotes')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]}>
            {suppliers.map((supplier) => (
                <View key={supplier.id} style={[styles.card, { width: cardWidth, backgroundColor: palette.card, borderColor: palette.border, opacity: supplier.is_active ? 1 : 0.6 }]}>
                    <View style={styles.cardHeader}>
                        <ThemedText style={styles.cardName} numberOfLines={1}>{supplier.name}</ThemedText>
                        <ThemedButton
                            icon="create-outline"
                            label={t('products.list.edit')}
                            variant="secondary"
                            style={styles.editBtn}
                            onPress={() => onEditSupplier(supplier.id)}
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
                    <View style={styles.actionsRow}>
                        <ThemedButton
                            variant="secondary"
                            tone={supplier.is_active ? 'warning' : 'success'}
                            icon={supplier.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                            style={styles.actionBtn}
                            label={supplier.is_active ? t('common.disable') : t('common.enable')}
                            onPress={() => onToggleSupplierActive(supplier.id, supplier.is_active)}
                        />
                        <ThemedButton
                            icon="trash-outline"
                            label={t('common.delete')}
                            tone="danger"
                            variant="secondary"
                            style={styles.actionBtn}
                            onPress={() => onDeleteSupplier(supplier.id)}
                        />
                    </View>
                </View>
            ))}
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
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
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
    actionsRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
});
