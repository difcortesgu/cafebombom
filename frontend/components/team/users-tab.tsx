import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { EntityCard, type CardAction } from '@/components/ui/entity-card';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useListControls } from '@/hooks/use-list-controls';
import { t } from '@/i18n';
import type { ManagedUser } from '@/types/auth';

type UsersTabProps = {
    users: ManagedUser[];
    currentUserId: string | null;
    gap: number;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        inputBackground: string;
        danger: string;
    };
    onEdit: (user: ManagedUser) => void;
    onDeactivate: (id: string) => void;
    onReactivate: (id: string) => void;
    onHardDelete: (id: string) => void;
};

type UserSortKey = 'name' | 'role';

const SORT_OPTIONS = [
    { key: 'name' as UserSortKey, labelAsc: t('common.sort.nameAZ'), labelDesc: t('common.sort.nameZA') },
    { key: 'role' as UserSortKey, labelAsc: t('common.sort.roleAsc'), labelDesc: t('common.sort.roleAsc') },
];

export function UsersTab({ users, currentUserId, gap, palette, onEdit, onDeactivate, onReactivate, onHardDelete }: UsersTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);
    const { searchQuery, setSearchQuery, sortKey, sortDirection, setSortKey } = useListControls<UserSortKey>('name');

    const processed = useMemo(() => {
        const q = searchQuery.toLowerCase();
        let list = users.filter((u) => !q || u.name.toLowerCase().includes(q));
        list = [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortKey === 'role') cmp = (a.role === 'owner' ? 0 : 1) - (b.role === 'owner' ? 0 : 1);
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [users, searchQuery, sortKey, sortDirection]);

    return (
        <View style={{ gap }}>
            <ListToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOptions={SORT_OPTIONS}
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={setSortKey}
            />

            {processed.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                    <ThemedText style={{ color: palette.mutedText }}>
                        {users.length === 0 ? t('settings.accounts.none') : t('common.filter.noResults')}
                    </ThemedText>
                </View>
            ) : (
                <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                    {processed.map((user) => {
                        const isSelf = !!currentUserId && currentUserId === user.id;
                        const canManageOthers = !!currentUserId && !isSelf;

                        const actions: CardAction[] = [];
                        if (isSelf || canManageOthers) {
                            actions.push({
                                icon: 'create-outline',
                                label: t('setup.account.edit'),
                                onPress: () => onEdit(user),
                            });
                        }
                        if (canManageOthers) {
                            actions.push(user.isActive
                                ? {
                                    icon: 'remove-circle-outline',
                                    label: t('userManagement.action.softDelete'),
                                    tone: 'warning',
                                    onPress: () => onDeactivate(user.id),
                                }
                                : {
                                    icon: 'refresh-circle-outline',
                                    label: t('userManagement.action.reactivate'),
                                    tone: 'success',
                                    onPress: () => onReactivate(user.id),
                                });
                            actions.push({
                                icon: 'trash-outline',
                                label: t('userManagement.action.hardDelete'),
                                tone: 'danger',
                                collapseOnNarrow: true,
                                onPress: () => onHardDelete(user.id),
                            });
                        }

                        return (
                            <EntityCard
                                key={user.id}
                                width={cardWidth}
                                title={user.name}
                                style={{ backgroundColor: palette.card, borderColor: palette.border }}
                                info={(
                                    <>
                                        <ThemedText style={[styles.role, { color: palette.mutedText }]}>
                                            {user.role === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}
                                        </ThemedText>
                                        <ThemedText style={[styles.status, { color: user.isActive ? palette.mutedText : palette.danger }]}>
                                            {user.isActive ? t('userManagement.status.active') : t('userManagement.status.softDeleted')}
                                        </ThemedText>
                                    </>
                                )}
                                actions={actions}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    role: {
        fontSize: 13,
        textAlign: 'right',
    },
    status: {
        fontSize: 12,
        textAlign: 'right',
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
});
