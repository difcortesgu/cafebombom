import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';

export default function SettingsScreen() {
  const { currentUser, logout } = useAuthStore();
  const { syncEnabled, lastSyncAt, toggleSync, markSynced } = useSettingsStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Settings</ThemedText>
      <ThemedText>Session and local sync controls.</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Current user</ThemedText>
        <View style={styles.row}>
          <ThemedText>Name:</ThemedText>
          <ThemedText type="defaultSemiBold">{currentUser?.name ?? '-'}</ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText>Role:</ThemedText>
          <ThemedText type="defaultSemiBold">{currentUser?.role ?? '-'}</ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Sync (optional)</ThemedText>
        <ThemedText style={styles.muted}>Supabase sync can be wired later; this toggle stores local intent.</ThemedText>

        <Pressable style={styles.secondaryButton} onPress={toggleSync}>
          <ThemedText>{syncEnabled ? 'Disable sync' : 'Enable sync'}</ThemedText>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={markSynced}>
          <ThemedText>Sync now (mock)</ThemedText>
        </Pressable>

        <ThemedText style={styles.muted}>
          Last sync: {lastSyncAt ? new Date(lastSyncAt * 1000).toLocaleString() : 'Never'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Session</ThemedText>
        <Pressable style={styles.primaryButton} onPress={logout}>
          <ThemedText style={styles.primaryText}>Logout</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">App</ThemedText>
        <ThemedText>Version: {Constants.expoConfig?.version ?? '1.0.0'}</ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1D4C8',
    padding: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  muted: {
    opacity: 0.7,
    fontSize: 13,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#B64D1A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#C8B7A4',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
});
