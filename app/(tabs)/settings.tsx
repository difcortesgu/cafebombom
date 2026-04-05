import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { THEME_OPTIONS } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { type ThemeModePreference, useSettingsStore } from '@/stores/settings';

export default function SettingsScreen() {
  const { currentUser, logout } = useAuthStore();
  const palette = useAppColors();
  const {
    syncEnabled,
    lastSyncAt,
    selectedThemeId,
    themeModePreference,
    deliverySurcharge,
    toGoSurcharge,
    hydrateFromDb,
    toggleSync,
    markSynced,
    setTheme,
    setThemeModePreference,
    setDeliverySurcharge,
    setToGoSurcharge,
  } = useSettingsStore();

  const [deliveryInput, setDeliveryInput] = useState(deliverySurcharge.toFixed(2));
  const [toGoInput, setToGoInput] = useState(toGoSurcharge.toFixed(2));

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
