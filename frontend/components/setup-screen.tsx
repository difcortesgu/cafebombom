import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { UserAccountModal } from '@/components/user-account-modal';
import { UserManagementTable } from '@/components/user-management-table';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { setupService } from '@/services';
import type { CreateUserPayload, ManagedUser, SetupUpdateUserPayload } from '@/types/auth';
import type { User } from '@/types/types';

interface SetupScreenProps {
  users: ManagedUser[];
  loading: boolean;
  error: string | null;
  createUser: (payload: CreateUserPayload) => Promise<User | null>;
  updateUser: (userId: string, payload: SetupUpdateUserPayload) => Promise<User | null>;
  deleteUser: (userId: string) => Promise<boolean>;
  reactivateUser: (userId: string) => Promise<boolean>;
  hardDeleteUser: (userId: string) => Promise<boolean>;
  hasOwnerAccount: boolean;
  hydrateInventory: () => Promise<void>;
  hydrateProducts: () => Promise<void>;
  onFinish: () => void;
}

type ModalMode = 'add' | 'edit';

export function SetupScreen({
  users,
  loading,
  error,
  createUser,
  updateUser,
  deleteUser,
  reactivateUser,
  hardDeleteUser,
  hasOwnerAccount,
  hydrateInventory,
  hydrateProducts,
  onFinish,
}: SetupScreenProps) {
  const palette = useAppColors();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [importBusy, setImportBusy] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const roleLabel = (role: 'owner' | 'staff') =>
    t(role === 'owner' ? 'auth.role.owner' : 'auth.role.staff');

  function openAddModal() {
    setModalMode('add');
    setEditingUser(null);
    setModalVisible(true);
  }

  function openEditModal(user: ManagedUser) {
    setModalMode('edit');
    setEditingUser({ id: user.id, name: user.name, role: user.role });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingUser(null);
  }

  async function handleSubmit(payload: { name: string; role: 'owner' | 'staff'; pin?: string }) {
    if (modalMode === 'add') {
      const created = await createUser({
        name: payload.name,
        role: payload.role,
        pin: payload.pin ?? '',
      });
      return Boolean(created);
    }

    if (editingUser) {
      const updatePayload: SetupUpdateUserPayload = {
        name: payload.name,
        role: payload.role,
        pin: payload.pin,
      };
      const updated = await updateUser(editingUser.id, updatePayload);
      return Boolean(updated);
    }

    return false;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('app.name')}</ThemedText>
      <ThemedText style={styles.helperText}>{t('setup.helperText')}</ThemedText>

      <ThemedButton
        disabled={importBusy}
        label={importBusy ? t('setup.import.uploading') : t('setup.import.upload')}
        onPress={async () => {
          try {
            setImportBusy(true);
            setImportIssues([]);
            setImportMessage(null);
            const result = await DocumentPicker.getDocumentAsync({
              type: [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
              ],
              multiple: false,
              copyToCacheDirectory: true,
            });
            if (result.canceled || result.assets.length === 0) return;
            const pickedFile = result.assets[0];
            const response = await fetch(pickedFile.uri);
            const buffer = await response.arrayBuffer();
            const importResult = await setupService.importSeedFromExcel(new Uint8Array(buffer));
            setImportMessage(
              t('setup.import.success', {
                categories: importResult.inserted.categories,
                ingredients: importResult.inserted.ingredients,
                products: importResult.inserted.products,
                tables: importResult.inserted.restaurantTables,
              }),
            );
            setImportIssues(importResult.issues.slice(0, 4));
            await Promise.all([hydrateInventory(), hydrateProducts()]);
          } catch (importError) {
            setImportMessage(t('setup.import.failed', { message: String((importError as Error)?.message ?? importError) }));
          } finally {
            setImportBusy(false);
          }
        }}
      />

      {importMessage ? <ThemedText style={styles.feedback}>{importMessage}</ThemedText> : null}
      {importIssues.map((issue) => (
        <ThemedText key={issue} style={[styles.feedback, { color: palette.danger }]}>
          {issue}
        </ThemedText>
      ))}

      <ThemedButton
        label={t('setup.account.add')}
        disabled={importBusy}
        onPress={openAddModal}
      />

      <UserManagementTable
        users={users}
        listTitle={t('setup.account.listTitle')}
        emptyText={t('setup.account.none')}
        roleLabel={roleLabel}
        activeStatusLabel={t('userManagement.status.active')}
        inactiveStatusLabel={t('userManagement.status.softDeleted')}
        renderActions={(user) => (
          <View style={styles.actionsRow}>
            {user.isActive ? (
              <>
                <ThemedButton
                  variant="secondary"
                  label={t('setup.account.edit')}
                  style={styles.actionBtn}
                  onPress={() => openEditModal(user)}
                />
                <ThemedButton
                  variant="secondary"
                  label={t('userManagement.action.softDelete')}
                  style={[styles.actionBtn, { borderColor: palette.warning }]}
                  onPress={() => void deleteUser(user.id)}
                />
              </>
            ) : (
              <>
                <ThemedButton
                  variant="secondary"
                  label={t('userManagement.action.reactivate')}
                  style={styles.actionBtn}
                  onPress={() => void reactivateUser(user.id)}
                />
                <ThemedButton
                  variant="secondary"
                  label={t('userManagement.action.hardDelete')}
                  style={[styles.actionBtn, { borderColor: palette.danger }]}
                  labelStyle={{ color: palette.danger }}
                  onPress={() => void hardDeleteUser(user.id)}
                />
              </>
            )}
          </View>
        )}
      />

      <ThemedButton variant="secondary" label={t('setup.finish')} disabled={!hasOwnerAccount || importBusy || loading} onPress={onFinish} />

      {!hasOwnerAccount ? (
        <ThemedText style={styles.feedback}>{t('setup.ownerRequired')}</ThemedText>
      ) : null}

      {error ? (
        <ThemedText style={[styles.feedback, { color: palette.danger }]}>{error}</ThemedText>
      ) : null}

      <UserAccountModal
        visible={modalVisible}
        mode={modalMode}
        loading={loading || importBusy}
        initialUser={editingUser}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 12,
  },
  helperText: {
    opacity: 0.92,
    marginBottom: 4,
  },
  feedback: {
    fontSize: 13,
    opacity: 0.9,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    minWidth: 96,
    paddingVertical: 6,
  },
});
