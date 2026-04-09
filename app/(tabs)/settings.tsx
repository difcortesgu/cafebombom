import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { THEME_OPTIONS } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { setupService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import { type ThemeModePreference, useSettingsStore } from '@/stores/settings';

export default function SettingsScreen() {
  const {
    currentUser,
    users,
    createUser,
    deactivateUser,
    updateCurrentUserProfile,
    loading: authLoading,
    error: authError,
    logout,
  } = useAuthStore();
  const hydrateInventory = useInventoryStore((state) => state.hydrate);
  const hydrateProducts = useProductsStore((state) => state.hydrate);
  const hydrateSales = useSalesStore((state) => state.hydrate);
  const palette = useAppColors();
  const {
    syncEnabled,
    lastSyncAt,
    selectedThemeId,
    themeModePreference,
    deliverySurcharge,
    toGoSurcharge,
    businessName,
    businessAddress,
    businessPhone,
    businessLogoUri,
    receiptFooterMessage,
    printerPaperWidth,
    taxRate,
    hydrateFromDb,
    toggleSync,
    markSynced,
    setTheme,
    setThemeModePreference,
    setDeliverySurcharge,
    setToGoSurcharge,
    setBusinessInfo,
    setPrinterPaperWidth,
    setTaxRate,
  } = useSettingsStore();

  const [deliveryInput, setDeliveryInput] = useState(deliverySurcharge.toFixed(2));
  const [toGoInput, setToGoInput] = useState(toGoSurcharge.toFixed(2));
  const [businessNameInput, setBusinessNameInput] = useState(businessName);
  const [businessAddressInput, setBusinessAddressInput] = useState(businessAddress);
  const [businessPhoneInput, setBusinessPhoneInput] = useState(businessPhone);
  const [businessLogoUriInput, setBusinessLogoUriInput] = useState(businessLogoUri ?? '');
  const [receiptFooterInput, setReceiptFooterInput] = useState(receiptFooterMessage);
  const [taxRateInput, setTaxRateInput] = useState((taxRate * 100).toFixed(2));
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoMessage, setLogoMessage] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountPin, setNewAccountPin] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<'owner' | 'staff'>('staff');
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profilePin, setProfilePin] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const MODE_OPTIONS: { label: string; value: ThemeModePreference }[] = [
    { label: t('settings.mode.system'), value: 'system' },
    { label: t('settings.mode.light'), value: 'light' },
    { label: t('settings.mode.dark'), value: 'dark' },
  ];

  useEffect(() => {
    void hydrateFromDb();
  }, [hydrateFromDb]);

  useEffect(() => {
    setDeliveryInput(deliverySurcharge.toFixed(2));
  }, [deliverySurcharge]);

  useEffect(() => {
    setToGoInput(toGoSurcharge.toFixed(2));
  }, [toGoSurcharge]);

  useEffect(() => {
    setBusinessNameInput(businessName);
  }, [businessName]);

  useEffect(() => {
    setBusinessAddressInput(businessAddress);
  }, [businessAddress]);

  useEffect(() => {
    setBusinessPhoneInput(businessPhone);
  }, [businessPhone]);

  useEffect(() => {
    setBusinessLogoUriInput(businessLogoUri ?? '');
  }, [businessLogoUri]);

  useEffect(() => {
    setReceiptFooterInput(receiptFooterMessage);
  }, [receiptFooterMessage]);

  useEffect(() => {
    setTaxRateInput((taxRate * 100).toFixed(2));
  }, [taxRate]);

  useEffect(() => {
    setProfileName(currentUser?.name ?? '');
  }, [currentUser?.name]);

  const parseFee = (raw: string) => {
    const numeric = Number.parseFloat(raw);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return Number(numeric.toFixed(2));
  };

  const commitDeliveryFee = () => {
    const value = parseFee(deliveryInput);
    setDeliverySurcharge(value);
    setDeliveryInput(value.toFixed(2));
  };

  const commitToGoFee = () => {
    const value = parseFee(toGoInput);
    setToGoSurcharge(value);
    setToGoInput(value.toFixed(2));
  };

  const commitBusinessInfo = () => {
    setBusinessInfo({
      name: businessNameInput.trim() || 'CafeBomBom',
      address: businessAddressInput.trim(),
      phone: businessPhoneInput.trim(),
      logoUri: businessLogoUriInput.trim() || null,
      footerMessage: receiptFooterInput.trim(),
    });
  };

  const commitTaxRate = () => {
    const numeric = Number.parseFloat(taxRateInput);
    const normalized = Number.isFinite(numeric) && numeric >= 0 ? numeric / 100 : taxRate;
    setTaxRate(normalized);
    setTaxRateInput((normalized * 100).toFixed(2));
  };

  const resolveLogoExtension = (uri: string, mimeType?: string) => {
    const maybeExt = uri.split('.').pop()?.toLowerCase();
    if (maybeExt && maybeExt.length <= 5) {
      return maybeExt;
    }

    if (mimeType?.includes('png')) {
      return 'png';
    }
    if (mimeType?.includes('webp')) {
      return 'webp';
    }
    return 'jpg';
  };

  const pickBusinessLogo = async () => {
    try {
      setLogoBusy(true);
      setLogoMessage(null);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setLogoMessage(t('settings.receipt.logoPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const selected = result.assets[0];
      const targetWidth = printerPaperWidth === 58 ? 256 : 384;
      const transformed = await manipulateAsync(
        selected.uri,
        [{ resize: { width: targetWidth } }],
        {
          compress: 0.92,
          format: SaveFormat.PNG,
          base64: Platform.OS === 'web',
        },
      );

      let persistedUri = transformed.uri;

      if (businessLogoUriInput && Platform.OS !== 'web' && FileSystem.documentDirectory && businessLogoUriInput.startsWith(FileSystem.documentDirectory)) {
        try {
          await FileSystem.deleteAsync(businessLogoUriInput, { idempotent: true });
        } catch {
          // Ignore cleanup failures; they should not block saving a new logo.
        }
      }

      if (Platform.OS === 'web') {
        if (transformed.base64) {
          persistedUri = `data:image/png;base64,${transformed.base64}`;
        }
      }

      if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
        const logoDir = `${FileSystem.documentDirectory}receipt-logo/`;
        await FileSystem.makeDirectoryAsync(logoDir, { intermediates: true });

        const ext = resolveLogoExtension(transformed.uri, selected.mimeType);
        const destination = `${logoDir}logo-${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: transformed.uri, to: destination });
        persistedUri = destination;
      }

      setBusinessLogoUriInput(persistedUri);
      setBusinessInfo({ logoUri: persistedUri });
      setLogoMessage(t('settings.receipt.logoOptimized'));
    } catch (error) {
      setLogoMessage(String((error as Error).message || t('sales.receipt.error')));
    } finally {
      setLogoBusy(false);
    }
  };

  const removeBusinessLogo = () => {
    if (businessLogoUriInput && Platform.OS !== 'web' && FileSystem.documentDirectory && businessLogoUriInput.startsWith(FileSystem.documentDirectory)) {
      void FileSystem.deleteAsync(businessLogoUriInput, { idempotent: true });
    }
    setBusinessLogoUriInput('');
    setBusinessInfo({ logoUri: null });
    setLogoMessage(null);
  };

  const importSeedData = async () => {
    try {
      setImportBusy(true);
      setImportMessage(null);
      setImportIssues([]);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const pickedFile = result.assets[0];
      const response = await fetch(pickedFile.uri);
      const buffer = await response.arrayBuffer();
      const importResult = await setupService.importSeedFromExcel(new Uint8Array(buffer));

      setImportMessage(
        `Imported ${importResult.inserted.suppliers} providers, ${importResult.inserted.employees} employees, ${importResult.inserted.categories} categories, ${importResult.inserted.ingredients} ingredients, ${importResult.inserted.products} products, and ${importResult.inserted.restaurantTables} tables.`,
      );
      setImportIssues(importResult.issues.slice(0, 4));

      await Promise.all([hydrateInventory(), hydrateProducts(), hydrateSales()]);
    } catch (importError) {
      setImportMessage(`Import failed: ${String((importError as Error)?.message ?? importError)}`);
    } finally {
      setImportBusy(false);
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('settings.title')}</ThemedText>
      <ThemedText>{t('settings.subtitle')}</ThemedText>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('settings.currentUser.title')}</ThemedText>
        <View style={styles.row}>
          <ThemedText>{t('settings.currentUser.name')}</ThemedText>
          <ThemedText type="defaultSemiBold">{currentUser?.name ?? '-'}</ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText>{t('settings.currentUser.role')}</ThemedText>
          <ThemedText type="defaultSemiBold">
            {currentUser?.role === 'owner' ? t('owner') : currentUser?.role === 'staff' ? t('staff') : '-'}
          </ThemedText>
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('settings.theme.title')}</ThemedText>
        <ThemedText style={styles.muted}>{t('settings.theme.subtitle')}</ThemedText>

        <View style={styles.modeRow}>
          {MODE_OPTIONS.map((opt) => {
            const isActive = themeModePreference === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: isActive ? palette.tint : palette.inputBackground,
                    borderColor: isActive ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setThemeModePreference(opt.value)}>
                <ThemedText
                  style={{ color: isActive ? palette.card : palette.text, fontWeight: isActive ? '700' : '400' }}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.themeList}>
          {THEME_OPTIONS.map((theme) => {
            const isActive = selectedThemeId === theme.id;
            return (
              <Pressable
                key={theme.id}
                style={[
                  styles.themeOption,
                  {
                    borderColor: isActive ? palette.tint : palette.border,
                    backgroundColor: isActive ? palette.card : 'transparent',
                  },
                ]}
                onPress={() => setTheme(theme.id)}>
                <View style={styles.themeHeader}>
                  <ThemedText type="defaultSemiBold">{theme.name}</ThemedText>
                  <ThemedText style={{ color: isActive ? palette.tint : palette.mutedText }}>
                      {isActive ? t('settings.theme.active') : t('settings.theme.select')}
                  </ThemedText>
                </View>

                <View style={styles.swatchRow}>
                  {theme.preview.map((color) => (
                    <View key={`${theme.id}-${color}`} style={[styles.swatch, { backgroundColor: color }]} />
                  ))}
                </View>

                <ThemedText style={styles.muted}>{theme.description}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('settings.fees.title')}</ThemedText>
        <ThemedText style={styles.muted}>{t('settings.fees.subtitle')}</ThemedText>

        <View style={styles.feeRow}>
          <ThemedText style={styles.feeLabel}>{t('settings.fees.delivery')}</ThemedText>
          <ThemedInput
            style={styles.feeInput}
            keyboardType="decimal-pad"
            value={deliveryInput}
            onChangeText={setDeliveryInput}
            onBlur={commitDeliveryFee}
            placeholder={t('settings.fees.placeholder')}
          />
        </View>

        <View style={styles.feeRow}>
          <ThemedText style={styles.feeLabel}>{t('settings.fees.toGo')}</ThemedText>
          <ThemedInput
            style={styles.feeInput}
            keyboardType="decimal-pad"
            value={toGoInput}
            onChangeText={setToGoInput}
            onBlur={commitToGoFee}
            placeholder={t('settings.fees.placeholder')}
          />
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('settings.receipt.title')}</ThemedText>
        <ThemedText style={styles.muted}>{t('settings.receipt.subtitle')}</ThemedText>

        <ThemedInput
          value={businessNameInput}
          placeholder={t('settings.receipt.businessName')}
          onChangeText={setBusinessNameInput}
          onBlur={commitBusinessInfo}
        />
        <ThemedInput
          value={businessAddressInput}
          placeholder={t('settings.receipt.businessAddress')}
          onChangeText={setBusinessAddressInput}
          onBlur={commitBusinessInfo}
        />
        <ThemedInput
          value={businessPhoneInput}
          placeholder={t('settings.receipt.businessPhone')}
          onChangeText={setBusinessPhoneInput}
          onBlur={commitBusinessInfo}
        />

        <View style={styles.logoActions}>
          <ThemedButton
            variant="secondary"
            label={logoBusy ? `${t('settings.receipt.pickLogo')}...` : t('settings.receipt.pickLogo')}
            onPress={() => void pickBusinessLogo()}
            disabled={logoBusy}
          />
          {businessLogoUriInput ? (
            <ThemedButton
              variant="secondary"
              label={t('settings.receipt.removeLogo')}
              onPress={removeBusinessLogo}
              disabled={logoBusy}
            />
          ) : null}
        </View>
        {businessLogoUriInput ? (
          <Image source={{ uri: businessLogoUriInput }} style={styles.logoPreview} contentFit="contain" />
        ) : (
          <ThemedText style={styles.muted}>{t('settings.receipt.noLogo')}</ThemedText>
        )}
        {logoMessage ? <ThemedText style={[styles.muted, { color: palette.danger }]}>{logoMessage}</ThemedText> : null}

        <ThemedInput
          value={receiptFooterInput}
          placeholder={t('settings.receipt.footerMessage')}
          onChangeText={setReceiptFooterInput}
          onBlur={commitBusinessInfo}
        />

        <View style={styles.feeRow}>
          <ThemedText style={styles.feeLabel}>{t('settings.receipt.taxRate')}</ThemedText>
          <ThemedInput
            style={styles.feeInput}
            keyboardType="decimal-pad"
            value={taxRateInput}
            onChangeText={setTaxRateInput}
            onBlur={commitTaxRate}
            placeholder="8.00"
          />
        </View>

        <ThemedText style={styles.muted}>{t('settings.receipt.paperWidth')}</ThemedText>
        <View style={styles.modeRow}>
          {[58, 80].map((width) => {
            const isActive = printerPaperWidth === width;
            return (
              <Pressable
                key={width}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: isActive ? palette.tint : palette.inputBackground,
                    borderColor: isActive ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setPrinterPaperWidth(width as 58 | 80)}>
                <ThemedText
                  style={{ color: isActive ? palette.card : palette.text, fontWeight: isActive ? '700' : '400' }}>
                  {width}mm
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('settings.sync.title')}</ThemedText>
        <ThemedText style={styles.muted}>{t('settings.sync.subtitle')}</ThemedText>

        <ThemedButton
          variant="secondary"
          style={styles.secondaryButton}
          label={syncEnabled ? t('settings.sync.disable') : t('settings.sync.enable')}
          onPress={toggleSync}
        />

        <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('settings.sync.now')} onPress={markSynced} />

        <ThemedText style={styles.muted}>
          {t('settings.sync.last')}: {lastSyncAt ? new Date(lastSyncAt * 1000).toLocaleString() : t('settings.sync.never')}
        </ThemedText>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Account Management</ThemedText>
        <ThemedText style={styles.muted}>Create employee accounts after setup. Only owners can add accounts.</ThemedText>

        <ThemedText type="defaultSemiBold">My Account Details</ThemedText>
        <ThemedInput
          value={profileName}
          placeholder="Your display name"
          onChangeText={setProfileName}
        />
        <ThemedInput
          value={profilePin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          placeholder="New PIN (optional)"
          onChangeText={setProfilePin}
        />
        <ThemedButton
          disabled={authLoading || profileName.trim().length === 0}
          label={authLoading ? 'Saving profile...' : 'Save My Details'}
          onPress={async () => {
            setProfileMessage(null);
            const ok = await updateCurrentUserProfile({
              name: profileName,
              pin: profilePin.trim().length > 0 ? profilePin : undefined,
            });
            if (ok) {
              setProfilePin('');
              setProfileMessage('Your account details were updated.');
            }
          }}
        />
        {profileMessage ? <ThemedText style={styles.muted}>{profileMessage}</ThemedText> : null}

        {currentUser?.role !== 'owner' ? (
          <ThemedText style={[styles.muted, { color: palette.danger }]}>Only owner accounts can create new users.</ThemedText>
        ) : (
          <>
            <ThemedInput
              value={newAccountName}
              placeholder="Employee name"
              onChangeText={setNewAccountName}
            />

            <View style={styles.modeRow}>
              {(['staff', 'owner'] as const).map((role) => {
                const isActive = newAccountRole === role;
                return (
                  <Pressable
                    key={role}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor: isActive ? palette.tint : palette.inputBackground,
                        borderColor: isActive ? palette.tint : palette.border,
                      },
                    ]}
                    onPress={() => setNewAccountRole(role)}>
                    <ThemedText
                      style={{ color: isActive ? palette.card : palette.text, fontWeight: isActive ? '700' : '400' }}>
                      {role === 'owner' ? t('owner') : t('staff')}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedInput
              value={newAccountPin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              placeholder="PIN (min 4 digits)"
              onChangeText={setNewAccountPin}
            />

            <ThemedButton
              disabled={authLoading || newAccountName.trim().length === 0 || newAccountPin.trim().length < 4}
              label={authLoading ? 'Creating account...' : 'Add Account'}
              onPress={async () => {
                const created = await createUser({
                  name: newAccountName,
                  role: newAccountRole,
                  pin: newAccountPin,
                });

                if (created) {
                  setNewAccountName('');
                  setNewAccountPin('');
                  setNewAccountRole('staff');
                  setAccountMessage(`Account created for ${created.name} (${t(created.role)}).`);
                } else {
                  setAccountMessage(null);
                }
              }}
            />
          </>
        )}

        {accountMessage ? <ThemedText style={styles.muted}>{accountMessage}</ThemedText> : null}
        {authError ? <ThemedText style={[styles.muted, { color: palette.danger }]}>{authError}</ThemedText> : null}

        <View style={styles.accountListWrap}>
          <ThemedText type="defaultSemiBold">Current accounts</ThemedText>
          {users.length === 0 ? (
            <ThemedText style={styles.muted}>No accounts available.</ThemedText>
          ) : (
            users.map((user) => {
              const canRemove = currentUser?.role === 'owner' && currentUser.id !== user.id;
              return (
                <View key={user.id} style={styles.accountRow}>
                  <ThemedText style={styles.muted}>
                    {user.name} ({t(user.role)})
                  </ThemedText>
                  {canRemove ? (
                    <ThemedButton
                      variant="secondary"
                      style={styles.removeButton}
                      label="Remove"
                      onPress={async () => {
                        setAccountMessage(null);
                        const ok = await deactivateUser(user.id);
                        if (ok) {
                          setAccountMessage(`Account removed for ${user.name}.`);
                        }
                      }}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Seed Data Import</ThemedText>
        <ThemedText style={styles.muted}>Upload an Excel file to import providers, employees, categories, inventory, products, recipes, tables, discounts, and surcharges.</ThemedText>
        <ThemedButton
          disabled={importBusy}
          label={importBusy ? 'Importing...' : 'Upload Seed Excel'}
          onPress={importSeedData}
        />
        {importMessage ? <ThemedText style={styles.muted}>{importMessage}</ThemedText> : null}
        {importIssues.map((issue) => (
          <ThemedText key={issue} style={[styles.muted, { color: palette.danger }]}>{issue}</ThemedText>
        ))}
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('settings.session.title')}</ThemedText>
        <ThemedButton label={t('settings.session.logout')} onPress={logout} />
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('settings.app.title')}</ThemedText>
        <ThemedText>{t('settings.app.version')}: {Constants.expoConfig?.version ?? '1.0.0'}</ThemedText>
      </ThemedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feeLabel: {
    flex: 1,
  },
  feeInput: {
    width: 120,
    textAlign: 'right',
  },
  logoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  logoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  muted: {
    opacity: 0.9,
    fontSize: 13,
  },
  themeList: {
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 6,
  },
  swatch: {
    flex: 1,
    height: 22,
    borderRadius: 6,
  },
  secondaryButton: {
    paddingVertical: 9,
  },
  accountListWrap: {
    gap: 4,
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  removeButton: {
    minWidth: 96,
    paddingVertical: 6,
  },
});
