import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { THEME_OPTIONS } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth';
import { type ThemeModePreference, useSettingsStore } from '@/stores/settings';

export default function SettingsScreen() {
  const { currentUser, logout } = useAuthStore();
  const palette = useAppColors();
  const { syncEnabled, lastSyncAt, selectedThemeId, themeModePreference, toggleSync, markSynced, setTheme, setThemeModePreference } = useSettingsStore();

  const MODE_OPTIONS: { label: string; value: ThemeModePreference }[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Settings</ThemedText>
      <ThemedText>Session and local sync controls.</ThemedText>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Current user</ThemedText>
        <View style={styles.row}>
          <ThemedText>Name:</ThemedText>
          <ThemedText type="defaultSemiBold">{currentUser?.name ?? '-'}</ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText>Role:</ThemedText>
          <ThemedText type="defaultSemiBold">{currentUser?.role ?? '-'}</ThemedText>
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Theme</ThemedText>
        <ThemedText style={styles.muted}>Choose one of the predefined palettes for the app.</ThemedText>

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
                    {isActive ? 'Active' : 'Select'}
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
        <ThemedText type="subtitle">Sync (optional)</ThemedText>
        <ThemedText style={styles.muted}>Supabase sync can be wired later; this toggle stores local intent.</ThemedText>

        <ThemedButton variant="secondary" style={styles.secondaryButton} label={syncEnabled ? 'Disable sync' : 'Enable sync'} onPress={toggleSync} />

        <ThemedButton variant="secondary" style={styles.secondaryButton} label="Sync now (mock)" onPress={markSynced} />

        <ThemedText style={styles.muted}>
          Last sync: {lastSyncAt ? new Date(lastSyncAt * 1000).toLocaleString() : 'Never'}
        </ThemedText>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Session</ThemedText>
        <ThemedButton label="Logout" onPress={logout} />
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">App</ThemedText>
        <ThemedText>Version: {Constants.expoConfig?.version ?? '1.0.0'}</ThemedText>
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
});
