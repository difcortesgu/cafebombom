import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { UserAccountModal } from '@/components/user-account-modal';
import { UserManagementTable } from '@/components/user-management-table';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { setupService } from '@/services';
import type { ReceiptPreferences } from '@/services/setup';
import type { CreateUserPayload, ManagedUser, SetupUpdateUserPayload } from '@/types/auth';
import type { User } from '@/types/types';

type ModalMode = 'add' | 'edit';

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

interface SetupStepTwoProps {
    users: ManagedUser[];
    loading: boolean;
    error: string | null;
    ownerSessionReady: boolean;
    createUser: (payload: CreateUserPayload) => Promise<User | null>;
    updateUser: (userId: string, payload: SetupUpdateUserPayload) => Promise<User | null>;
    deleteUser: (userId: string) => Promise<boolean>;
    reactivateUser: (userId: string) => Promise<boolean>;
    hardDeleteUser: (userId: string) => Promise<boolean>;
    hydrateInventory: () => Promise<void>;
    hydrateProducts: () => Promise<void>;
    onOwnerLogin: (userId: string, pin: string) => Promise<boolean>;
    onFinish: () => void;
}

export function SetupStepTwo({
    users,
    loading,
    error,
    ownerSessionReady,
    createUser,
    updateUser,
    deleteUser,
    reactivateUser,
    hardDeleteUser,
    hydrateInventory,
    hydrateProducts,
    onOwnerLogin,
    onFinish,
}: SetupStepTwoProps) {
    const palette = useAppColors();

    const [prefs, setPrefs] = useState<ReceiptPreferences>(defaultReceiptPreferences);
    const [taxRatePercent, setTaxRatePercent] = useState('0');
    const [prefsBusy, setPrefsBusy] = useState(false);
    const [prefsLoaded, setPrefsLoaded] = useState(false);

    const [importMessage, setImportMessage] = useState<string | null>(null);
    const [importIssues, setImportIssues] = useState<string[]>([]);
    const [importBusy, setImportBusy] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('add');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const roleLabel = (role: 'owner' | 'staff') =>
        t(role === 'owner' ? 'auth.role.owner' : 'auth.role.staff');

    useEffect(() => {
        if (!ownerSessionReady || prefsLoaded) return;

        let cancelled = false;

        void (async () => {
            try {
                setPrefsBusy(true);
                const current = await setupService.getReceiptPreferences();
                if (cancelled) return;
                setPrefs(current);
                setTaxRatePercent((current.taxRate * 100).toFixed(2));
                setPrefsLoaded(true);
            } finally {
                if (!cancelled) setPrefsBusy(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [ownerSessionReady, prefsLoaded]);

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
                await onOwnerLogin(created.id, payload.pin);
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
        <>
            {!ownerSessionReady ? (
                <ThemedText style={{ opacity: 0.9, fontSize: 13, color: palette.warning }}>
                    {t('setup.step2.authRequired')}
                </ThemedText>
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
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {user.isActive ? (
                                    <>
                                        <ThemedButton
                                            variant="secondary"
                                            label={t('setup.account.edit')}
                                            style={{ minWidth: 96, paddingVertical: 6 }}
                                            onPress={() => openEditModal(user)}
                                        />
                                        <ThemedButton
                                            variant="secondary"
                                            label={t('userManagement.action.softDelete')}
                                            style={{ minWidth: 96, paddingVertical: 6, borderColor: palette.warning }}
                                            onPress={() => void deleteUser(user.id)}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <ThemedButton
                                            variant="secondary"
                                            label={t('userManagement.action.reactivate')}
                                            style={{ minWidth: 96, paddingVertical: 6 }}
                                            onPress={() => void reactivateUser(user.id)}
                                        />
                                        <ThemedButton
                                            variant="secondary"
                                            label={t('userManagement.action.hardDelete')}
                                            style={{ minWidth: 96, paddingVertical: 6, borderColor: palette.danger }}
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

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[58, 80].map((paperWidth) => {
                            const isActive = prefs.paperWidth === paperWidth;
                            return (
                                <ThemedButton
                                    key={paperWidth}
                                    variant="secondary"
                                    label={`${paperWidth}mm`}
                                    style={[
                                        { flex: 1 },
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
                                        paymentMethods:
                                            importResult.summary.paymentMethods.inserted + importResult.summary.paymentMethods.updated,
                                        categories: importResult.summary.categories.inserted + importResult.summary.categories.updated,
                                        ingredients: importResult.summary.ingredients.inserted + importResult.summary.ingredients.updated,
                                        products: importResult.summary.products.inserted + importResult.summary.products.updated,
                                        tables: importResult.summary.restaurantTables.inserted + importResult.summary.restaurantTables.updated,
                                    }),
                                );
                                setImportIssues(importResult.issues.map((issue) => issue.message));
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
                        disabled={importBusy || prefsBusy}
                        label="Descargar plantilla Excel v2"
                        onPress={async () => {
                            try {
                                setImportBusy(true);
                                setImportMessage(null);

                                const file = await setupService.downloadImportTemplate();

                                if (Platform.OS === 'web') {
                                    const blob = new Blob([file.bytes], {
                                        type: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const anchor = document.createElement('a');
                                    anchor.href = url;
                                    anchor.download = file.fileName;
                                    anchor.click();
                                    URL.revokeObjectURL(url);
                                    setImportMessage('Plantilla descargada.');
                                    return;
                                }

                                if (Platform.OS === 'android') {
                                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                                    if (!permissions.granted) {
                                        setImportMessage('Permiso denegado. Selecciona la carpeta Descargas para guardar la plantilla.');
                                        return;
                                    }

                                    const destination = await FileSystem.StorageAccessFramework.createFileAsync(
                                        permissions.directoryUri,
                                        file.fileName,
                                        file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                    );

                                    await FileSystem.writeAsStringAsync(destination, Buffer.from(file.bytes).toString('base64'), {
                                        encoding: FileSystem.EncodingType.Base64,
                                    });
                                    setImportMessage(`Plantilla guardada en la carpeta seleccionada: ${file.fileName}`);
                                    return;
                                }

                                if (!FileSystem.documentDirectory) {
                                    setImportMessage('No se pudo acceder al almacenamiento local.');
                                    return;
                                }

                                const templateDir = `${FileSystem.documentDirectory}templates/`;
                                await FileSystem.makeDirectoryAsync(templateDir, { intermediates: true });
                                const destination = `${templateDir}${file.fileName}`;
                                await FileSystem.writeAsStringAsync(destination, Buffer.from(file.bytes).toString('base64'), {
                                    encoding: FileSystem.EncodingType.Base64,
                                });
                                setImportMessage(`Plantilla guardada en: ${destination}`);
                            } catch (downloadError) {
                                setImportMessage(`Descarga fallida: ${String((downloadError as Error)?.message ?? downloadError)}`);
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

            {error ? (
                <ThemedText style={{ fontSize: 13, opacity: 0.9, color: palette.danger }}>{error}</ThemedText>
            ) : null}

            {importMessage ? (
                <ThemedText style={{ fontSize: 13, opacity: 0.9 }}>{importMessage}</ThemedText>
            ) : null}
            {importIssues.map((issue) => (
                <ThemedText key={issue} style={{ fontSize: 13, opacity: 0.9, color: palette.danger }}>
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
        </>
    );
}
