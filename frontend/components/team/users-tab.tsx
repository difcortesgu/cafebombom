import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { t } from '@/i18n';
import type { ManagedUser } from '@/types/auth';

type UsersTabProps = {
    users: ManagedUser[];
    currentUserId: string | null;
    cardWidth: number;
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

export function UsersTab({ users, currentUserId, cardWidth, gap, palette, onEdit, onDeactivate, onReactivate, onHardDelete }: UsersTabProps) {
    if (users.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('settings.accounts.none')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]}>
            {users.map((user) => {
                const isSelf = !!currentUserId && currentUserId === user.id;
                const canManageOthers = !!currentUserId && !isSelf;
                return (
                    <View key={user.id} style={[styles.card, { width: cardWidth, backgroundColor: palette.card, borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold" numberOfLines={1}>{user.name}</ThemedText>
                        <ThemedText style={[styles.role, { color: palette.mutedText }]}>
                            {user.role === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}
                        </ThemedText>
                        <ThemedText style={[styles.status, { color: user.isActive ? palette.mutedText : palette.danger }]}>
                            {user.isActive ? t('userManagement.status.active') : t('userManagement.status.softDeleted')}
                        </ThemedText>
                        {isSelf || canManageOthers ? (
                            <View style={styles.actions}>
                                <ThemedButton
                                    variant="secondary"
                                    icon="create-outline"
                                    label={t('setup.account.edit')}
                                    style={styles.actionBtn}
                                    accessibilityLabel={t('setup.account.edit')}
                                    onPress={() => onEdit(user)}
                                />
                                {canManageOthers ? (
                                    <>
                                        {user.isActive ? (
                                            <ThemedButton
                                                variant="secondary"
                                                tone="warning"
                                                icon="remove-circle-outline"
                                                style={styles.actionBtn}
                                                label={t('userManagement.action.softDelete')}
                                                onPress={() => onDeactivate(user.id)}
                                            />
                                        ) : (
                                            <ThemedButton
                                                variant="secondary"
                                                tone="success"
                                                icon="refresh-circle-outline"
                                                style={styles.actionBtn}
                                                label={t('userManagement.action.reactivate')}
                                                onPress={() => onReactivate(user.id)}
                                            />
                                        )}
                                        <ThemedButton
                                            variant="secondary"
                                            tone="danger"
                                            icon="trash-outline"
                                            label={t('userManagement.action.hardDelete')}
                                            style={styles.actionBtn}
                                            onPress={() => onHardDelete(user.id)}
                                        />
                                    </>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    card: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
    },
    role: {
        fontSize: 13,
    },
    status: {
        fontSize: 12,
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
    },
    actionBtn: {
        flex: 1,
    },
});
