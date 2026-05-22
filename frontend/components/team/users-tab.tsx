import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { UserAccountModal } from '@/components/user-account-modal';
import { UserManagementTable } from '@/components/user-management-table';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

export function UsersTab() {
    const palette = useAppColors();
    const {
        currentUser,
        managedUsers,
        createUser,
        deactivateUser,
        reactivateUser,
        hardDeleteUser,
        loading: authLoading,
        error: authError,
    } = useAuthStore();

    const [accountModalVisible, setAccountModalVisible] = useState(false);
    const [accountMessage, setAccountMessage] = useState<string | null>(null);

    return (
        <>
            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('settings.accounts.title')}</ThemedText>
                <ThemedText style={styles.muted}>{t('settings.accounts.subtitle')}</ThemedText>

                <ThemedButton
                    label={t('setup.account.add')}
                    disabled={authLoading}
                    onPress={() => {
                        setAccountMessage(null);
                        setAccountModalVisible(true);
                    }}
                />

                {accountMessage ? <ThemedText style={styles.muted}>{accountMessage}</ThemedText> : null}
                {authError ? <ThemedText style={[styles.muted, { color: palette.danger }]}>{authError}</ThemedText> : null}

                <UserManagementTable
                    users={managedUsers}
                    listTitle={t('settings.accounts.listTitle')}
                    emptyText={t('settings.accounts.none')}
                    roleLabel={(role) => (role === 'owner' ? t('auth.role.owner') : t('auth.role.staff'))}
                    activeStatusLabel={t('userManagement.status.active')}
                    inactiveStatusLabel={t('userManagement.status.softDeleted')}
                    renderActions={(user) => {
                        const canManage = currentUser?.role === 'owner' && currentUser.id !== user.id;
                        if (!canManage) {
                            return <ThemedText style={styles.muted}>-</ThemedText>;
                        }
                        return (
                            <View style={styles.rowActions}>
                                {user.isActive ? (
                                    <ThemedButton
                                        variant="secondary"
                                        style={styles.smallButton}
                                        label={t('userManagement.action.softDelete')}
                                        onPress={async () => {
                                            setAccountMessage(null);
                                            const ok = await deactivateUser(user.id);
                                            if (ok) setAccountMessage(t('settings.accounts.message.deactivated', { name: user.name }));
                                        }}
                                    />
                                ) : (
                                    <ThemedButton
                                        variant="secondary"
                                        style={styles.smallButton}
                                        label={t('userManagement.action.reactivate')}
                                        onPress={async () => {
                                            setAccountMessage(null);
                                            const ok = await reactivateUser(user.id);
                                            if (ok) setAccountMessage(t('settings.accounts.message.reactivated', { name: user.name }));
                                        }}
                                    />
                                )}
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.smallButton}
                                    icon="trash.fill"
                                    accessibilityLabel={t('userManagement.action.hardDeleteA11y')}
                                    onPress={async () => {
                                        setAccountMessage(null);
                                        const ok = await hardDeleteUser(user.id);
                                        if (ok) setAccountMessage(t('settings.accounts.message.hardDeleted', { name: user.name }));
                                    }}
                                />
                            </View>
                        );
                    }}
                />
            </ThemedCard>

            <UserAccountModal
                visible={accountModalVisible}
                mode="add"
                loading={authLoading}
                onClose={() => setAccountModalVisible(false)}
                onSubmit={async (payload) => {
                    const created = await createUser({
                        name: payload.name,
                        role: payload.role,
                        pin: payload.pin ?? '',
                    });
                    if (!created) return false;
                    setAccountMessage(`Cuenta creada para ${created.name} (${created.role === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}).`);
                    return true;
                }}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    rowActions: {
        flexDirection: 'row',
        gap: 8,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    smallButton: {
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
});
