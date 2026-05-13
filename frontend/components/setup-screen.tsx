import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SetupOwnerAccount } from '@/components/setup-owner-account';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { UserAccountModal } from '@/components/user-account-modal';
import { UserManagementTable } from '@/components/user-management-table';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { setupService } from '@/services';
import type { ReceiptPreferences } from '@/services/setup';
import type { CreateUserPayload, LoginPayload, ManagedUser, SetupUpdateUserPayload } from '@/types/auth';
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
  hasOwnerSession: boolean;
  login: (payload: LoginPayload) => Promise<boolean>;
  hydrateInventory: () => Promise<void>;
  hydrateProducts: () => Promise<void>;
  onFinish: () => void;
}

type ModalMode = 'add' | 'edit';
type SetupStep = 1 | 2;

const defaultReceiptPreferences: ReceiptPreferences = {
  businessName: '',
  businessAddress: '',
  businessPhone: '',
  businessNit: '',
  businessLogoUri: null,
  footerMessage: '',
  paperWidth: 80,
  taxRate: 0,
};

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
  hasOwnerSession,
  login,
  hydrateInventory,
  hydrateProducts,
  onFinish,
}: SetupScreenProps) {
  const palette = useAppColors();
  const [step, setStep] = useState<SetupStep>(1);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [importBusy, setImportBusy] = useState(false);
  const [ownerSessionReady, setOwnerSessionReady] = useState(hasOwnerSession);
  const [prefs, setPrefs] = useState<ReceiptPreferences>(defaultReceiptPreferences);
  const [taxRatePercent, setTaxRatePercent] = useState('0');
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const roleLabel = (role: 'owner' | 'staff') =>
    t(role === 'owner' ? 'auth.role.owner' : 'auth.role.staff');

  useEffect(() => {
    setOwnerSessionReady(hasOwnerSession);
  }, [hasOwnerSession]);

  useEffect(() => {
    if (step === 1 && hasOwnerAccount && ownerSessionReady) {
      setStep(2);
    }
  }, [step, hasOwnerAccount, ownerSessionReady]);

  useEffect(() => {
    if (step !== 2 || !ownerSessionReady || prefsLoaded) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setPrefsBusy(true);
        const current = await setupService.getReceiptPreferences();
        if (cancelled) {
          return;
        }
        setPrefs(current);
        setTaxRatePercent((current.taxRate * 100).toFixed(2));
        setPrefsLoaded(true);
      } finally {
        if (!cancelled) {
          setPrefsBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, ownerSessionReady, prefsLoaded]);

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
      if (created?.role === 'owner' && payload.pin && !ownerSessionReady) {
        const signedIn = await login({ userId: created.id, pin: payload.pin });
        setOwnerSessionReady(signedIn);
      }
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
      <ThemedText style={styles.helperText}>
        {step === 1 ? t('setup.step1.helperText') : t('setup.step2.helperText')}
      </ThemedText>

      <View style={styles.stepPills}>
        <View style={[styles.stepPill, step === 1 ? { backgroundColor: palette.tint } : { borderColor: palette.border, borderWidth: 1 }]}> 
          <ThemedText style={step === 1 ? { color: palette.card, fontWeight: '700' } : undefined}>
            {t('setup.step1.title')}
          </ThemedText>
        </View>
        <View style={[styles.stepPill, step === 2 ? { backgroundColor: palette.tint } : { borderColor: palette.border, borderWidth: 1 }]}> 
          <ThemedText style={step === 2 ? { color: palette.card, fontWeight: '700' } : undefined}>
            {t('setup.step2.title')}
          </ThemedText>
        </View>
      </View>

      {step === 1 ? (
        <>
          <SetupOwnerAccount
            loading={loading}
            onSubmit={async ({ name, pin }) => {
              const created = await createUser({ name, role: 'owner', pin });
              if (!created) {
                return;
              }

              const signedIn = await login({ userId: created.id, pin });
              setOwnerSessionReady(signedIn);
              if (signedIn) {
                setStep(2);
              }
            }}
          />
        </>
      ) : (
        <>
          {!ownerSessionReady ? (
            <ThemedText style={[styles.feedback, { color: palette.warning }]}>{t('setup.step2.authRequired')}</ThemedText>
          ) : (
            <>
              <ThemedButton
                label={t('setup.account.add')}
                disabled={importBusy || prefsBusy}
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

              <ThemedText type="subtitle">{t('setup.restaurant.title')}</ThemedText>
              <ThemedInput
                value={prefs.businessName}
                placeholder={t('setup.restaurant.businessName')}
                onChangeText={(value) => setPrefs((prev) => ({ ...prev, businessName: value }))}
              />
              <ThemedInput
                value={prefs.businessAddress}
                placeholder={t('setup.restaurant.businessAddress')}
                onChangeText={(value) => setPrefs((prev) => ({ ...prev, businessAddress: value }))}
              />
              <ThemedInput
                value={prefs.businessPhone}
                placeholder={t('setup.restaurant.businessPhone')}
                onChangeText={(value) => setPrefs((prev) => ({ ...prev, businessPhone: value }))}
              />
              <ThemedInput
                value={prefs.businessNit}
                placeholder={t('setup.restaurant.businessNit')}
                onChangeText={(value) => setPrefs((prev) => ({ ...prev, businessNit: value }))}
              />
              <ThemedInput
                value={taxRatePercent}
                keyboardType="decimal-pad"
                placeholder={t('setup.restaurant.taxRatePercent')}
                onChangeText={setTaxRatePercent}
              />

              <View style={styles.paperWidthRow}>
                {[58, 80].map((paperWidth) => {
                  const isActive = prefs.paperWidth === paperWidth;
                  return (
                    <ThemedButton
                      key={paperWidth}
                      variant="secondary"
                      label={`${paperWidth}mm`}
                      style={[
                        styles.paperWidthButton,
                        isActive ? { borderColor: palette.tint, backgroundColor: `${palette.tint}20` } : null,
                      ]}
                      onPress={() => setPrefs((prev) => ({ ...prev, paperWidth: paperWidth as 58 | 80 }))}
                    />
                  );
                })}
              </View>

              <ThemedButton
                label={prefsBusy ? t('setup.restaurant.saving') : t('setup.restaurant.save')}
                disabled={prefsBusy || loading}
                onPress={async () => {
                  const parsedTaxRate = Number.parseFloat(taxRatePercent.replace(',', '.'));
                  const normalizedTaxRate = Number.isFinite(parsedTaxRate)
                    ? Math.max(0, Math.min(100, parsedTaxRate)) / 100
                    : 0;

                  const payload: ReceiptPreferences = {
                    ...prefs,
                    businessName: prefs.businessName.trim(),
                    taxRate: normalizedTaxRate,
                  };

                  if (!payload.businessName) {
                    setImportMessage(t('setup.restaurant.businessNameRequired'));
                    return;
                  }

                  try {
                    setPrefsBusy(true);
                    await setupService.saveReceiptPreferences(payload);
                    setPrefs(payload);
                    setTaxRatePercent((payload.taxRate * 100).toFixed(2));
                    setImportMessage(t('setup.restaurant.saved'));
                  } catch (saveError) {
                    setImportMessage(t('setup.import.failed', { message: String((saveError as Error)?.message ?? saveError) }));
                  } finally {
                    setPrefsBusy(false);
                  }
                }}
              />

              <ThemedButton
                disabled={importBusy || prefsBusy}
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

              <ThemedButton
                variant="secondary"
                label={t('setup.finish')}
                disabled={importBusy || prefsBusy || loading}
                onPress={onFinish}
              />
            </>
          )}
        </>
      )}

      {error ? (
        <ThemedText style={[styles.feedback, { color: palette.danger }]}>{error}</ThemedText>
      ) : null}

      {importMessage ? <ThemedText style={styles.feedback}>{importMessage}</ThemedText> : null}
      {importIssues.map((issue) => (
        <ThemedText key={issue} style={[styles.feedback, { color: palette.danger }]}> 
          {issue}
        </ThemedText>
      ))}

      <UserAccountModal
        visible={modalVisible}
        mode={modalMode}
        loading={loading || importBusy || prefsBusy}
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
  stepPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stepPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
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
  paperWidthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paperWidthButton: {
    flex: 1,
  },
});
