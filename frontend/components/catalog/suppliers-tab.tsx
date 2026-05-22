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
    };
    onEditSupplier: (supplierId: string) => void;
};

export function SuppliersTab({ suppliers, cardWidth, gap, palette, onEditSupplier }: SuppliersTabProps) {
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
                <View key={supplier.id} style={[styles.card, { width: cardWidth, backgroundColor: palette.card, borderColor: palette.border }]}>
                    <View style={styles.cardHeader}>
                        <ThemedText style={styles.cardName} numberOfLines={1}>{supplier.name}</ThemedText>
                        <ThemedButton
                            icon="pencil"
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
        width: 34,
        height: 34,
        minHeight: 0,
        borderRadius: 10,
        paddingHorizontal: 0,
        paddingVertical: 0,
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
});
