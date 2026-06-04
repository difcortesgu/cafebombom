import { useEffect, useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { applyDesktopUpdate, checkForUpdate, type UpdateInfo } from '@/services/updates';
import { downloadAndInstallApk } from '@/services/apk-installer';

type Phase = 'idle' | 'downloading' | 'installing' | 'restarting' | 'error';

/**
 * Checks GitHub for a newer release on mount and, when one is available, prompts
 * the user to update. On Android it downloads the APK and launches the system
 * installer; on web it links to the GitHub release (desktop self-update arrives
 * in Phase 3).
 */
export function UpdateChecker() {
  const palette = useAppColors();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await checkForUpdate(controller.signal);
      if (result?.updateAvailable) {
        setInfo(result);
      }
    })();
    return () => controller.abort();
  }, []);

  const visible = !!info?.updateAvailable && !dismissed;
  if (!visible || !info) {
    return null;
  }

  const apkUrl = info.assets.apk;

  const handleUpdate = async () => {
    // Web build = the desktop app: let the backend self-update and relaunch.
    if (Platform.OS === 'web') {
      setPhase('restarting');
      try {
        await applyDesktopUpdate();
      } catch (error) {
        // A network failure (TypeError from fetch) means the server already
        // exited to apply the update — expected, so stay in the restarting state.
        // Any other error is a real HTTP failure (e.g. 401 not logged in, 500
        // already on latest) and must surface so the user isn't stuck forever.
        if (!(error instanceof TypeError)) {
          setPhase('error');
        }
      }
      return;
    }

    // Android: download the APK and hand off to the system installer.
    if (Platform.OS !== 'android' || !apkUrl) {
      void Linking.openURL(info.releaseUrl);
      return;
    }

    setPhase('downloading');
    setPercent(0);
    try {
      await downloadAndInstallApk(apkUrl, (p) => setPercent(Math.round(p.progress * 100)));
      setPhase('installing');
    } catch {
      setPhase('error');
    }
  };

  const busy = phase === 'downloading' || phase === 'installing' || phase === 'restarting';
  const primaryLabel =
    phase === 'downloading'
      ? t('update.downloading', { percent })
      : phase === 'installing'
        ? t('update.installing')
        : phase === 'restarting'
          ? t('update.restarting')
          : t('update.install');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => !busy && setDismissed(true)}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('update.title')}
          </ThemedText>

          <ThemedText style={[styles.message, { color: palette.mutedText }]}>
            {t('update.message', { current: info.currentVersion, latest: info.latestVersion })}
          </ThemedText>

          {info.notes ? (
            <ThemedText style={[styles.notes, { color: palette.mutedText }]} numberOfLines={6}>
              {info.notes}
            </ThemedText>
          ) : null}

          {phase === 'error' ? (
            <ThemedText style={[styles.message, { color: palette.danger }]}>{t('update.error')}</ThemedText>
          ) : null}

          <View style={styles.actions}>
            {!busy ? (
              <ThemedButton
                label={t('update.later')}
                variant="secondary"
                onPress={() => setDismissed(true)}
                style={styles.action}
              />
            ) : null}
            <ThemedButton
              label={primaryLabel}
              onPress={handleUpdate}
              disabled={busy}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  notes: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  action: {
    minWidth: 120,
  },
});
