import { type Href, Slot, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { LoginScreen } from '@/components/login-screen';
import { SetupScreen } from '@/components/setup-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

const COLLAPSED_WIDTH = 68;
const EXPANDED_WIDTH = 236;
const MOBILE_BREAKPOINT = 900;
const MOBILE_DRAWER_WIDTH = 280;
const LABEL_MAX_WIDTH = 156;

type SidebarItem = {
  key: string;
  href: Href;
  title: string;
  icon:
  | 'chart.bar.fill'
  | 'books.vertical.fill'
  | 'gearshape.2.fill'
  | 'person.2.fill'
  | 'cart.fill'
  | 'dollarsign.circle.fill'
  | 'shippingbox.fill'
  | 'arrow.down.circle.fill'
  | 'paintbrush.fill';
  badge?: number;
};

export default function TabLayout() {
  const palette = useAppColors();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [setupMode, setSetupMode] = useState(false);
  const [bootHydrated, setBootHydrated] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const isMobileLayout = width < MOBILE_BREAKPOINT;
  const canHoverSidebar = Platform.OS === 'web' && !isMobileLayout;
  const [expanded, setExpanded] = useState(!canHoverSidebar);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarWidth = useRef(new Animated.Value(canHoverSidebar ? COLLAPSED_WIDTH : EXPANDED_WIDTH)).current;
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const labelReveal = useRef(new Animated.Value(canHoverSidebar ? 0 : 1)).current;

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
    logout,
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

  const visibleTabs = useMemo<string[]>(() => {
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

  useEffect(() => {
    setExpanded(!canHoverSidebar);
  }, [canHoverSidebar]);

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: canHoverSidebar ? (expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH) : EXPANDED_WIDTH,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [canHoverSidebar, expanded, sidebarWidth]);

  useEffect(() => {
    Animated.timing(labelReveal, {
      toValue: canHoverSidebar ? (expanded ? 1 : 0) : 1,
      duration: 170,
      useNativeDriver: false,
    }).start();
  }, [canHoverSidebar, expanded, labelReveal]);

  useEffect(() => {
    if (!isMobileLayout && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [drawerOpen, isMobileLayout]);

  useEffect(() => {
    Animated.timing(drawerProgress, {
      toValue: drawerOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerProgress]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const ownerRoutes = new Set(['dashboard', 'catalog', 'operations', 'team']);
    const staffRoutes = new Set(['sales', 'cash-register', 'restock', 'expenses']);
    const currentRoute = pathname.replace(/^\//, '').split('/')[0] ?? '';

    if (currentUser.role === 'owner' && staffRoutes.has(currentRoute)) {
      router.replace('/dashboard');
      return;
    }

    if (currentUser.role !== 'owner' && ownerRoutes.has(currentRoute)) {
      router.replace('/sales');
    }
  }, [currentUser, pathname, router]);

  const activeRoute = pathname.replace(/^\//, '').split('/')[0] ?? '';

  useEffect(() => {
    if (isMobileLayout) {
      setDrawerOpen(false);
    }
  }, [activeRoute, isMobileLayout]);

  const navItems = useMemo<SidebarItem[]>(() => {
    const ownerItems: SidebarItem[] = [
      { key: 'dashboard', href: '/dashboard', title: t('nav.tab.dashboard'), icon: 'chart.bar.fill' },
      { key: 'catalog', href: '/catalog', title: t('nav.tab.catalog'), icon: 'books.vertical.fill' },
      { key: 'operations', href: '/operations', title: t('nav.tab.operations'), icon: 'gearshape.2.fill' },
      { key: 'team', href: '/team', title: t('nav.tab.team'), icon: 'person.2.fill' },
      { key: 'appearance', href: '/appearance', title: t('nav.tab.appearance'), icon: 'paintbrush.fill' },
    ];

    const staffItems: SidebarItem[] = [
      { key: 'sales', href: '/sales', title: t('nav.tab.sales'), icon: 'cart.fill' },
      { key: 'cash-register', href: '/cash-register', title: t('nav.tab.cashRegister'), icon: 'dollarsign.circle.fill' },
      {
        key: 'restock',
        href: '/restock',
        title: t('nav.tab.restock'),
        icon: 'shippingbox.fill',
        badge: alertCount > 0 ? alertCount : undefined,
      },
      { key: 'expenses', href: '/expenses', title: t('nav.tab.expenses'), icon: 'arrow.down.circle.fill' },
      { key: 'appearance', href: '/appearance', title: t('nav.tab.appearance'), icon: 'paintbrush.fill' },
    ];

    const selected = isOwner ? ownerItems : staffItems;
    return selected.filter((item) => visibleTabs.includes(item.key));
  }, [alertCount, isOwner, visibleTabs]);

  const isCompact = Platform.OS === 'web' && !expanded;
  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-MOBILE_DRAWER_WIDTH - 24, 0],
  });
  const overlayOpacity = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const labelShellStyle = {
    opacity: labelReveal,
    transform: [
      {
        translateX: labelReveal.interpolate({
          inputRange: [0, 1],
          outputRange: [-18, 0],
        }),
      },
    ],
    width: labelReveal.interpolate({
      inputRange: [0, 1],
      outputRange: [0, LABEL_MAX_WIDTH],
    }),
  };

  const handleNavPress = (href: Href) => {
    router.push(href);
    if (isMobileLayout) {
      setDrawerOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    if (isMobileLayout) {
      setDrawerOpen(false);
    }
  };

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

  const sidebarContent = (
    <View style={styles.sidebarInner}>
      <View style={[styles.brandBlock, isCompact ? styles.brandBlockCompact : null]}>
        <View style={[styles.brandIcon, { backgroundColor: palette.card }]}>
          <IconSymbol name="takeoutbag.and.cup.and.straw.fill" size={22} color={palette.tint} />
        </View>
        <Animated.View style={[styles.labelShell, labelShellStyle]}>
          <Text style={[styles.brandText, { color: palette.card }]} numberOfLines={1}>
            CafeBomBom
          </Text>
        </Animated.View>
      </View>

      <View style={styles.navList}>
        {navItems.map((item) => {
          const isActive = activeRoute === item.key || (item.key === 'dashboard' && activeRoute === '(tabs)');
          return (
            <Pressable
              key={item.key}
              onPress={() => handleNavPress(item.href)}
              style={({ pressed }) => [
                styles.navItem,
                isCompact ? styles.navItemCompact : null,
                {
                  opacity: pressed ? 0.9 : 1,
                  backgroundColor: isActive ? palette.card : 'transparent',
                },
              ]}>
              <View style={styles.navIconRow}>
                <IconSymbol
                  size={22}
                  name={item.icon}
                  color={isActive ? palette.tint : palette.card}
                />
                {item.badge ? (
                  <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.badgeText, { color: palette.background }]}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Animated.View style={[styles.labelShell, labelShellStyle]}>
                <Text
                  style={[styles.navText, { color: isActive ? palette.tint : palette.card }]}
                  numberOfLines={1}>
                  {item.title}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => void handleLogout()}
        style={({ pressed }) => [
          styles.navItem,
          styles.logoutItem,
          isCompact ? styles.navItemCompact : null,
          {
            opacity: pressed ? 0.9 : 1,
          },
        ]}>
        <View style={styles.navIconRow}>
          <IconSymbol
            size={22}
            name="lock.fill"
            color={palette.card}
          />
        </View>
        <Animated.View style={[styles.labelShell, labelShellStyle]}>
          <Text style={[styles.navText, { color: palette.card }]} numberOfLines={1}>
            {t('settings.session.logout')}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.shell, { backgroundColor: palette.background }]}>
      {isMobileLayout ? null : (
        <Animated.View
          onPointerEnter={canHoverSidebar ? () => setExpanded(true) : undefined}
          onPointerLeave={canHoverSidebar ? () => setExpanded(false) : undefined}
          style={[
            styles.sidebar,
            {
              backgroundColor: palette.tint,
              width: sidebarWidth,
              borderColor: palette.border,
            },
          ]}>
          {sidebarContent}
        </Animated.View>
      )}

      <View
        style={[
          styles.contentShell,
          isMobileLayout ? styles.contentShellMobile : null,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}>
        {isMobileLayout ? (
          <>
            <Pressable
              onPress={() => setDrawerOpen(true)}
              style={[styles.mobileMenuButton, { backgroundColor: palette.tint }]}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu">
              <View style={[styles.menuLine, { backgroundColor: palette.card }]} />
              <View style={[styles.menuLine, { backgroundColor: palette.card }]} />
              <View style={[styles.menuLine, { backgroundColor: palette.card }]} />
            </Pressable>
            <View style={styles.mobileContentSlot}>
              <Slot />
            </View>
          </>
        ) : (
          <Slot />
        )}
      </View>

      {isMobileLayout ? (
        <>
          <Animated.View
            pointerEvents={drawerOpen ? 'auto' : 'none'}
            style={[
              styles.mobileOverlay,
              {
                opacity: overlayOpacity,
              },
            ]}>
            <Pressable style={styles.mobileOverlayDismiss} onPress={() => setDrawerOpen(false)} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sidebar,
              styles.mobileSidebar,
              {
                backgroundColor: palette.tint,
                borderColor: palette.border,
                transform: [{ translateX: drawerTranslateX }],
              },
            ]}>
            {sidebarContent}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    gap: 0,
  },
  sidebar: {
    borderWidth: 1,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'visible',
    paddingVertical: 18,
    paddingLeft: 8,
    paddingRight: 8,
    zIndex: 4,
  },
  sidebarInner: {
    flex: 1,
    gap: 20,
  },
  brandBlock: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  brandBlockCompact: {
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 0,
    gap: 0,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
  },
  navList: {
    flex: 1,
    gap: 8,
    paddingRight: 0,
  },
  navItem: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  navItemCompact: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    alignSelf: 'center',
    width: 52,
    gap: 0,
  },
  navIconRow: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  labelShell: {
    overflow: 'hidden',
  },
  logoutItem: {
    marginTop: 8,
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
  contentShell: {
    flex: 1,
    marginLeft: -2,
    borderWidth: 1,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: 'hidden',
    zIndex: 1,
  },
  contentShellMobile: {
    marginLeft: 0,
  },
  mobileMenuButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  menuLine: {
    width: 16,
    height: 2,
    borderRadius: 999,
  },
  mobileContentSlot: {
    flex: 1,
    paddingTop: 58,
  },
  mobileOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
    backgroundColor: 'rgba(15, 20, 24, 0.32)',
  },
  mobileOverlayDismiss: {
    flex: 1,
  },
  mobileSidebar: {
    position: 'absolute',
    left: 12,
    top: 12,
    bottom: 12,
    width: MOBILE_DRAWER_WIDTH,
    zIndex: 8,
  },
});
