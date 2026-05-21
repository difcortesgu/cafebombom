import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { t } from '@/i18n';
import type { RestaurantTable } from '@/types/types';

type TablesSectionProps = {
    tables: RestaurantTable[];
    message: string | null;
    borderColor: string;
    onAdd: () => void;
    onEdit: (tableId: string) => void;
    onDelete: (tableId: string) => void;
};

export function TablesSection({ tables, message, borderColor, onAdd, onEdit, onDelete }: TablesSectionProps) {
    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle">{t('tables.list')}</ThemedText>
                <ThemedButton label={t('tables.add')} onPress={onAdd} />
            </View>
            {message ? <ThemedText style={styles.muted}>{message}</ThemedText> : null}
            {tables.length === 0 ? (
                <ThemedText style={styles.muted}>{t('tables.empty')}</ThemedText>
            ) : (
                tables.map((table) => (
                    <View key={table.id} style={[styles.tableRow, { borderColor }]}>
                        <View style={styles.tableTextWrap}>
                            <ThemedText type="defaultSemiBold">{table.name}</ThemedText>
                            <ThemedText style={styles.muted}>
                                {table.table_type === 'to-go'
                                    ? t('tables.type.toGo')
                                    : table.table_type === 'delivery'
                                        ? t('tables.type.delivery')
                                        : t('tables.type.dineIn')}
                            </ThemedText>
                        </View>
                        <View style={styles.rowActions}>
                            <ThemedButton
                                variant="secondary"
                                style={styles.smallButton}
                                label={t('tables.edit')}
                                onPress={() => onEdit(table.id)}
                            />
                            <ThemedButton
                                variant="secondary"
                                style={styles.smallButton}
                                icon="trash.fill"
                                accessibilityLabel={t('tables.deleted')}
                                onPress={() => onDelete(table.id)}
                            />
                        </View>
                    </View>
                ))
            )}
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    rowActions: {
        flexDirection: 'row',
        gap: 8,
    },
    tableRow: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    tableTextWrap: {
        flex: 1,
        gap: 2,
    },
    smallButton: {
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
