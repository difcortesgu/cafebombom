import * as DocumentPicker from 'expo-document-picker';
import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { setupService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

export default function TabLayout() {
  const palette = useAppColors();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [setupRole, setSetupRole] = useState<'owner' | 'staff'>('owner');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [bootHydrated, setBootHydrated] = useState(false);

  const { users, currentUser, hydrate: hydrateAuth, createUser, login, loading, error } = useAuthStore();
  const { hydrate: hydrateInventory, lowStockCount } = useInventoryStore();
  const { hydrate: hydrateProducts } = useProductsStore();

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      hydrateAuth(),
      hydrateInventory(),
      hydrateProducts(),
    ]).finally(() => {
      if (!cancelled) {
        setBootHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, hydrateInventory, hydrateProducts]);

  useEffect(() => {
    if (users.length > 0 && selectedUserId === null) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const isOwner = currentUser?.role === 'owner';
  const alertCount = lowStockCount();
  const hasAccounts = users.length > 0;
  const hasOwnerAccount = users.some((user) => user.role === 'owner');

  const visibleTabs = useMemo(() => {
    if (isOwner) {
      return ['index', 'sales', 'inventory', 'accounts', 'settings'];
    }
    return ['sales', 'inventory'];
  }, [isOwner]);

  useEffect(() => {
    if (!bootHydrated) {
      return;
    }

    if (!loading && !currentUser && !hasAccounts) {
      setSetupMode(true);
    }
  }, [bootHydrated, loading, currentUser, hasAccounts]);

  const canUnlockSession = !loading && !!selectedUserId && pin.length >= 4;
  const roleLabel = (role: 'owner' | 'staff') => t(role === 'owner' ? 'auth.role.owner' : 'auth.role.staff');

  const handleUnlockSession = async () => {
    if (!selectedUserId || pin.length < 4 || loading) {
      return;
    }

    const success = await login({ userId: selectedUserId, pin });
    if (success) {
      setPin('');
    }
  };

  if (!currentUser && setupMode) {
    return (
      <ThemedView style={styles.loginContainer}>
        <ThemedText type="title">{t('app.name')}</ThemedText>
        <ThemedText style={styles.helperText}>First-time setup: import your seed Excel (optional), then create employee accounts with roles.</ThemedText>

        <View style={styles.setupActions}>
          <ThemedButton
            disabled={setupBusy}
            onPress={async () => {
              try {
                setSetupBusy(true);
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

                if (result.canceled || result.assets.length === 0) {
                  return;
                }

                const pickedFile = result.assets[0];
                const response = await fetch(pickedFile.uri);
                const buffer = await response.arrayBuffer();
                const importResult = await setupService.importSeedFromExcel(new Uint8Array(buffer));

                setImportMessage(
                  `Imported ${importResult.inserted.categories} categories, ${importResult.inserted.ingredients} ingredients, ${importResult.inserted.products} products, and ${importResult.inserted.restaurantTables} tables.`,
                );
                setImportIssues(importResult.issues.slice(0, 4));
                await Promise.all([hydrateInventory(), hydrateProducts()]);
              } catch (importError) {
                setImportMessage(`Import failed: ${String((importError as Error)?.message ?? importError)}`);
              } finally {
                setSetupBusy(false);
              }
            }}>
            <ThemedText style={[styles.loginButtonText, { color: palette.card }]}>{setupBusy ? 'Importing...' : 'Upload Excel Seed'}</ThemedText>
          </ThemedButton>

          <ThemedButton
            variant="secondary"
            disabled={setupBusy}
            onPress={() => {
              setImportMessage('Excel import skipped. Continue with manual account setup.');
              setImportIssues([]);
            }}>
            <ThemedText>Skip Import</ThemedText>
          </ThemedButton>
        </View>

        {importMessage ? <ThemedText style={styles.setupFeedback}>{importMessage}</ThemedText> : null}
        {importIssues.map((issue) => (
          <ThemedText key={issue} style={[styles.setupFeedback, { color: palette.danger }]}>
            {issue}
          </ThemedText>
        ))}

        <ThemedText type="subtitle" style={styles.setupSectionTitle}>Create Employee Account</ThemedText>

        <ThemedInput
          value={setupName}
          placeholder="Employee name"
          onChangeText={setSetupName}
        />

        <View style={styles.roleRow}>
          {(['owner', 'staff'] as const).map((role) => {
            const active = setupRole === role;
            return (
              <Pressable
                key={role}
                style={[
                  styles.roleButton,
                  { borderColor: palette.border },
                  active ? { backgroundColor: palette.tint, borderColor: palette.tint } : null,
                ]}
                onPress={() => setSetupRole(role)}>
                <ThemedText style={active ? { color: palette.card, fontWeight: '700' } : {}}>
                  {roleLabel(role)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedInput
          value={setupPin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          placeholder="PIN (min 4 digits)"
          onChangeText={setSetupPin}
        />

        <ThemedButton
          disabled={loading || setupBusy || setupName.trim().length === 0 || setupPin.trim().length < 4}
          onPress={async () => {
            const created = await createUser({ name: setupName, role: setupRole, pin: setupPin });
            if (created) {
              setSetupName('');
              setSetupPin('');
              setSetupRole('staff');
            }
          }}>
          <ThemedText style={[styles.loginButtonText, { color: palette.card }]}>{loading ? 'Saving...' : 'Add Employee Account'}</ThemedText>
        </ThemedButton>

        <View style={styles.createdUsersWrap}>
          <ThemedText type="defaultSemiBold">Created users</ThemedText>
          {users.length === 0 ? (
            <ThemedText style={styles.setupFeedback}>No users created yet.</ThemedText>
          ) : (
            users.map((user) => (
              <ThemedText key={user.id} style={styles.setupFeedback}>
                {user.name} ({roleLabel(user.role)})
              </ThemedText>
            ))
          )}
        </View>

        <ThemedButton
          variant="secondary"
          disabled={!hasOwnerAccount || setupBusy || loading}
          onPress={() => setSetupMode(false)}>
          <ThemedText>Finish Setup</ThemedText>
        </ThemedButton>

        {!hasOwnerAccount ? (
          <ThemedText style={styles.setupFeedback}>Create at least one owner account to finish setup.</ThemedText>
        ) : null}

        {error ? <ThemedText style={[styles.errorText, { color: palette.danger }]}>{error}</ThemedText> : null}
      </ThemedView>
    );
  }

  if (!currentUser) {
    return (
      <ThemedView style={styles.loginContainer}>
        <ThemedText type="title">{t('app.name')}</ThemedText>
        <ThemedText style={styles.helperText}>{t('auth.login.prompt')}</ThemedText>

        <View style={styles.userRow}>
          {users.map((user) => (
            <Pressable
              key={user.id}
              style={[
                styles.userButton,
                { borderColor: palette.border },
                selectedUserId === user.id && styles.userButtonActive,
                selectedUserId === user.id && { backgroundColor: palette.tint, borderColor: palette.tint },
              ]}
              onPress={() => setSelectedUserId(user.id)}>
              <IconSymbol
                name="person.fill"
                size={18}
                color={selectedUserId === user.id ? palette.card : palette.icon}
              />
              <ThemedText
                style={[
                  selectedUserId === user.id ? styles.activeUserText : styles.userText,
                  selectedUserId === user.id && { color: palette.card },
                ]}>
                {user.name} ({roleLabel(user.role)})
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedInput
          value={pin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          placeholder={t('auth.login.pinPlaceholder')}
          style={styles.pinInput}
          onChangeText={setPin}
          onSubmitEditing={() => {
            void handleUnlockSession();
          }}
        />

        {error ? <ThemedText style={[styles.errorText, { color: palette.danger }]}>{error}</ThemedText> : null}

        <ThemedButton
          style={styles.loginButton}
          disabled={!canUnlockSession}
          onPress={handleUnlockSession}>
          <View style={styles.loginButtonContent}>
            <IconSymbol name="lock.fill" size={16} color={palette.card} />
            <ThemedText style={[styles.loginButtonText, { color: palette.card }]}>{loading ? t('auth.login.signingIn') : t('auth.login.unlock')}</ThemedText>
          </View>
        </ThemedButton>

        <ThemedText style={[styles.hint, { color: palette.mutedText }]}>Select your account and enter the assigned PIN.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: visibleTabs.includes('index') ? undefined : null,
          title: t('nav.tab.dashboard'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          href: visibleTabs.includes('sales') ? undefined : null,
          title: t('nav.tab.sales'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: visibleTabs.includes('inventory') ? undefined : null,
          title: t('nav.stack.inventory'),
          tabBarBadge: alertCount > 0 ? alertCount : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="shippingbox.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tables"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          href: visibleTabs.includes('accounts') ? undefined : null,
          title: t('nav.stack.accounts'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="dollarsign.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: visibleTabs.includes('settings') ? undefined : null,
          title: t('nav.tab.settings'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  helperText: {
    opacity: 0.92,
    marginBottom: 8,
  },
  userRow: {
    gap: 8,
    marginBottom: 8,
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D2D2D2',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  userButtonActive: {
    backgroundColor: '#B64D1A',
    borderColor: '#B64D1A',
  },
  userText: {
    fontWeight: '600',
  },
  activeUserText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pinInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 3,
  },
  loginButton: {
    marginTop: 6,
    paddingVertical: 12,
  },
  loginButtonContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    fontWeight: '600',
  },
  hint: {
    opacity: 0.9,
    fontSize: 13,
  },
  setupActions: {
    gap: 8,
  },
  setupFeedback: {
    fontSize: 13,
    opacity: 0.9,
  },
  setupSectionTitle: {
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createdUsersWrap: {
    marginTop: 2,
    gap: 4,
  },
});
