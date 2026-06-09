import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
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

export function SuppliersTab({ suppliers, gap, palette, onEditSupplier, onDeleteSupplier, onToggleSupplierActive }: SuppliersTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);

    if (suppliers.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('inventory.suppliers.noNotes')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]} onLayout={onLayout}>
            {suppliers.map((supplier) => (
                <EntityCard
                    key={supplier.id}
                    width={cardWidth}
                    title={supplier.name}
                    titleNumberOfLines={1}
                    style={{ backgroundColor: palette.card, borderColor: palette.border, opacity: supplier.is_active ? 1 : 0.6 }}
                    actions={[
                        {
                            icon: 'create-outline',
                            label: t('products.list.edit'),
                            onPress: () => onEditSupplier(supplier.id),
                        },
                        {
                            icon: supplier.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline',
                            label: supplier.is_active ? t('common.disable') : t('common.enable'),
                            tone: supplier.is_active ? 'warning' : 'success',
                            onPress: () => onToggleSupplierActive(supplier.id, supplier.is_active),
                        },
                        {
                            icon: 'trash-outline',
                            label: t('common.delete'),
                            tone: 'danger',
                            collapseOnNarrow: true,
                            onPress: () => onDeleteSupplier(supplier.id),
                        },
                    ]}
                >
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
                </EntityCard>
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
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    infoText: {
        fontSize: 12,
        flex: 1,
    },
});
