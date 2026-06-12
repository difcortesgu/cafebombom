import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { EntityCard } from '@/components/ui/entity-card';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useListControls } from '@/hooks/use-list-controls';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type PaymentMethodsSectionProps = {
    gap: number;
    onAdd: () => void;
    onEdit: (method: { id: string; name: string; icon: string; is_active: boolean }) => void;
};

type PaymentSortKey = 'name';

const SORT_OPTIONS = [
    { key: 'name' as PaymentSortKey, labelAsc: t('common.sort.nameAZ'), labelDesc: t('common.sort.nameZA') },
];

export function PaymentMethodsSection({ gap, onAdd, onEdit }: PaymentMethodsSectionProps) {
    const palette = useAppColors();
    const { onLayout, cardWidth } = useMeasuredGrid(gap);
    const { methods, hydrateAll, toggleMethod, deleteMethod } = usePaymentMethodsStore();
    const { searchQuery, setSearchQuery, sortKey, sortDirection, setSortKey } = useListControls<PaymentSortKey>('name');

    useEffect(() => {
        void hydrateAll();
    }, [hydrateAll]);

    const processed = useMemo(() => {
        const q = searchQuery.toLowerCase();
        let list = methods.filter((m) => !q || m.name.toLowerCase().includes(q));
        list = [...list].sort((a, b) => {
            const cmp = a.name.localeCompare(b.name);
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [methods, searchQuery, sortKey, sortDirection]);

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle" style={styles.headerTitle}>{t('settings.paymentMethods.title')}</ThemedText>
                <ThemedButton icon="add-circle-outline" size="sm" label={t('settings.paymentMethods.addButton')} onPress={onAdd} />
            </View>

            <ListToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOptions={SORT_OPTIONS}
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={setSortKey}
            />

            {processed.length === 0 ? (
                <ThemedText style={styles.muted}>
                    {methods.length === 0 ? t('settings.paymentMethods.empty') : t('common.filter.noResults')}
                </ThemedText>
            ) : (
                <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                    {processed.map((method) => (
                        <EntityCard
                            key={method.id}
                            width={cardWidth}
                            title={method.name}
                            style={{ borderColor: method.is_active ? palette.border : `${palette.border}66`, opacity: method.is_active ? 1 : 0.6 }}
                            titleLeading={(
                                <Ionicons
                                    name={method.icon as any}
                                    size={22}
                                    color={method.is_active ? palette.tint : palette.mutedText}
                                />
                            )}
                            actions={[
                                {
                                    icon: 'create-outline',
                                    label: t('products.list.edit'),
                                    onPress: () => onEdit({ id: method.id, name: method.name, icon: method.icon, is_active: method.is_active }),
                                },
                                {
                                    icon: method.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline',
                                    label: method.is_active ? t('common.disable') : t('common.enable'),
                                    tone: method.is_active ? 'warning' : 'success',
                                    onPress: () => void (async () => { try { await toggleMethod(method.id, method.is_active); toast.success(method.is_active ? `Método "${method.name}" deshabilitado.` : `Método "${method.name}" habilitado.`); } catch { toast.error('Ocurrió un error. Intenta de nuevo.'); } })(),
                                },
                                {
                                    icon: 'trash-outline',
                                    label: t('common.delete'),
                                    tone: 'danger',
                                    collapseOnNarrow: true,
                                    onPress: () => void (async () => { try { await deleteMethod(method.id); toast.success(`Método "${method.name}" eliminado.`); } catch { toast.error('Ocurrió un error. Intenta de nuevo.'); } })(),
                                },
                            ]}
                        />
                    ))}
                </View>
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
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        flex: 1,
        minWidth: 120,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
