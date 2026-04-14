import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { LoginScreen } from '@/components/login-screen';
import { SetupScreen } from '@/components/setup-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
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

    void Promise.all([hydrateInventory(), hydrateProducts()]).finally(() => {
      if (!cancelled) {
        setHydratedUserId(currentUser.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser, hydrateInventory, hydrateProducts, hydratedUserId]);

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
      return ['index', 'sales', 'inventory', 'accounts', 'settings'];
    }
    return ['sales', 'inventory'];
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
