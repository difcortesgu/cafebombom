import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { LoginScreen } from '@/components/login-screen';
import { SetupScreen } from '@/components/setup-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

export default function TabLayout() {
  const palette = useAppColors();
  const [setupMode, setSetupMode] = useState(false);
  const [bootHydrated, setBootHydrated] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);

  const {
    users,
    managedUsers,
    currentUser,
    isSetupDone,
    hydrate: hydrateAuth,
    setupCreateUser,
    setupDeleteUser,
    setupReactivateUser,
    setupHardDeleteUser,
    setupUpdateUser,
    login,
    loading,
    error,
  } = useAuthStore();
  const { hydrate: hydrateInventory, lowStockCount } = useInventoryStore();
  const { hydrate: hydrateProducts } = useProductsStore();
  const { hydrate: hydrateAccounts } = useAccountsStore();

  useEffect(() => {
    let cancelled = false;

    void hydrateAuth().finally(() => {
      if (!cancelled) {
        setBootHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateAuth]);

  useEffect(() => {
    if (!currentUser || hydratedUserId === currentUser.id) {
      return;
    }

    let cancelled = false;

    const tasks: Promise<unknown>[] = [hydrateInventory(), hydrateProducts()];
    if (currentUser.role === 'staff') {
      tasks.push(hydrateAccounts());
    }

    void Promise.all(tasks).finally(() => {
      if (!cancelled) {
        setHydratedUserId(currentUser.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser, hydrateAccounts, hydrateInventory, hydrateProducts, hydratedUserId]);

  useEffect(() => {
    if (currentUser) {
      return;
    }
    setHydratedUserId(null);
  }, [currentUser]);

  const isOwner = currentUser?.role === 'owner';
  const alertCount = lowStockCount();
  const hasOwnerAccount = managedUsers.some((user) => user.role === 'owner' && user.isActive);

  const visibleTabs = useMemo(() => {
    if (isOwner) {
      return ['dashboard', 'catalog', 'operations', 'team', 'appearance'];
    }
    return ['sales', 'cash-register', 'restock', 'expenses', 'appearance'];
  }, [isOwner]);

  useEffect(() => {
    if (!bootHydrated) {
      return;
    }

    if (!loading && !setupMode && isSetupDone === false) {
      setSetupMode(true);
    }
    if (!loading && !setupMode && isSetupDone === true) {
      setSetupMode(false);
    }
  }, [bootHydrated, loading, setupMode, isSetupDone]);

  if (setupMode) {
    return (
      <SetupScreen
        users={managedUsers}
        loading={loading}
        error={error}
        createUser={setupCreateUser}
        deleteUser={setupDeleteUser}
        reactivateUser={setupReactivateUser}
        hardDeleteUser={setupHardDeleteUser}
        updateUser={setupUpdateUser}
        hasOwnerAccount={hasOwnerAccount}
        hasOwnerSession={currentUser?.role === 'owner'}
        login={login}
        hydrateInventory={hydrateInventory}
        hydrateProducts={hydrateProducts}
        onFinish={() => setSetupMode(false)}
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        loading={loading}
        error={error}
        login={login}
      />
    );
  }

  return (
    <Tabs
      initialRouteName={isOwner ? 'dashboard' : 'sales'}
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
      {/* ── Owner tabs ─────────────────────────────────────── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          href: visibleTabs.includes('dashboard') ? undefined : null,
          title: t('nav.tab.dashboard'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          href: visibleTabs.includes('catalog') ? undefined : null,
          title: t('nav.tab.catalog'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="books.vertical.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          href: visibleTabs.includes('operations') ? undefined : null,
          title: t('nav.tab.operations'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          href: visibleTabs.includes('team') ? undefined : null,
          title: t('nav.tab.team'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.2.fill" color={color} />,
        }}
      />
      {/* ── Staff tabs ─────────────────────────────────────── */}
      <Tabs.Screen
        name="sales"
        options={{
          href: visibleTabs.includes('sales') ? undefined : null,
          title: t('nav.tab.sales'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cash-register"
        options={{
          href: visibleTabs.includes('cash-register') ? undefined : null,
          title: t('nav.tab.cashRegister'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="dollarsign.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="restock"
        options={{
          href: visibleTabs.includes('restock') ? undefined : null,
          title: t('nav.tab.restock'),
          tabBarBadge: alertCount > 0 ? alertCount : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="shippingbox.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          href: visibleTabs.includes('expenses') ? undefined : null,
          title: t('nav.tab.expenses'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="arrow.down.circle.fill" color={color} />,
        }}
      />
      {/* ── Shared tab ─────────────────────────────────────── */}
      <Tabs.Screen
        name="appearance"
        options={{
          href: visibleTabs.includes('appearance') ? undefined : null,
          title: t('nav.tab.appearance'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="paintbrush.fill" color={color} />,
        }}
      />
      {/* ── Legacy files (hidden) ──────────────────────────── */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="accounts" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="tables" options={{ href: null }} />
    </Tabs>
  );
}
