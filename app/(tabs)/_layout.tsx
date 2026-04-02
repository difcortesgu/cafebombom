import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useInventoryStore } from '@/lib/stores/inventory-store';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pin, setPin] = useState('');

  const { users, currentUser, hydrate: hydrateAuth, login, loading, error } = useAuthStore();
  const { hydrate: hydrateInventory, lowStockCount } = useInventoryStore();

  useEffect(() => {
    hydrateAuth();
    hydrateInventory();
  }, [hydrateAuth, hydrateInventory]);

  useEffect(() => {
    if (users.length > 0 && selectedUserId === null) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const isOwner = currentUser?.role === 'owner';
  const alertCount = lowStockCount();

  const visibleTabs = useMemo(() => {
    if (isOwner) {
      return ['index', 'sales', 'inventory', 'accounts', 'settings'];
    }
    return ['sales', 'inventory'];
  }, [isOwner]);

  if (!currentUser) {
    return (
      <ThemedView style={styles.loginContainer}>
        <ThemedText type="title">CafeBomBom</ThemedText>
        <ThemedText style={styles.helperText}>Sign in with your local PIN</ThemedText>

        <View style={styles.userRow}>
          {users.map((user) => (
            <Pressable
              key={user.id}
              style={[styles.userButton, selectedUserId === user.id && styles.userButtonActive]}
              onPress={() => setSelectedUserId(user.id)}>
              <IconSymbol
                name="person.fill"
                size={18}
                color={selectedUserId === user.id ? '#FFFFFF' : Colors[colorScheme ?? 'light'].icon}
              />
              <ThemedText
                style={selectedUserId === user.id ? styles.activeUserText : styles.userText}>
                {user.name} ({user.role})
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={pin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          placeholder="Enter PIN"
          placeholderTextColor="#8E8E8E"
          style={styles.pinInput}
          onChangeText={setPin}
        />

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <Pressable
          style={styles.loginButton}
          disabled={loading || !selectedUserId || pin.length < 4}
          onPress={async () => {
            if (!selectedUserId) {
              return;
            }
            const success = await login(selectedUserId, pin);
            if (success) {
              setPin('');
            }
          }}>
          <IconSymbol name="lock.fill" size={16} color="#FFFFFF" />
          <ThemedText style={styles.loginButtonText}>{loading ? 'Signing in...' : 'Unlock Session'}</ThemedText>
        </Pressable>

        <ThemedText style={styles.hint}>Default PINs: Owner 1234, Staff 2222</ThemedText>
      </ThemedView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: visibleTabs.includes('index') ? undefined : null,
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          href: visibleTabs.includes('sales') ? undefined : null,
          title: 'Sales',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: visibleTabs.includes('inventory') ? undefined : null,
          title: 'Inventory',
          tabBarBadge: alertCount > 0 ? alertCount : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="shippingbox.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          href: visibleTabs.includes('accounts') ? undefined : null,
          title: 'Accounts',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="dollarsign.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: visibleTabs.includes('settings') ? undefined : null,
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
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
    opacity: 0.75,
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
    borderWidth: 1,
    borderColor: '#D2D2D2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 3,
  },
  loginButton: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#B64D1A',
    paddingVertical: 12,
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
    color: '#B93A2E',
    fontWeight: '600',
  },
  hint: {
    opacity: 0.6,
    fontSize: 13,
  },
});
