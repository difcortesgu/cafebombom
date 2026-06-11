import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BackendConnectionForm } from '@/components/connection/backend-connection-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useIsWide } from '@/components/ui/centered-page';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { LoginPayload } from '@/types/auth';
import type { User } from '@/types/types';

interface LoginScreenProps {
  users: User[];
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  refreshConnection: () => Promise<void>;
}

export function LoginScreen({ users, loading, error, login, refreshConnection }: LoginScreenProps) {
  const palette = useAppColors();
  const isWide = useIsWide();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    users.length > 0 ? users[0].id : null,
  );
  const [pin, setPin] = useState('');
  const [hasConnectionFailure, setHasConnectionFailure] = useState(false);

  useEffect(() => {
    if (users.length > 0 && selectedUserId === null) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    if (!error) {
      setHasConnectionFailure(false);
      return;
    }

    const normalized = error.toLowerCase();
    const looksLikeConnectionFailure =
      normalized.includes('failed to fetch') ||
      normalized.includes('network request failed') ||
      normalized.includes('http ') ||
      normalized.includes('conexion') ||
      normalized.includes('conexión') ||
      normalized.includes('backend') ||
      normalized.includes('setup/status');

    if (looksLikeConnectionFailure) {
      setHasConnectionFailure(true);
      return;
    }

    setHasConnectionFailure(false);
  }, [error]);

  const roleLabel = (role: 'owner' | 'staff') =>
    t(role === 'owner' ? 'auth.role.owner' : 'auth.role.staff');

  const canUnlock = !loading && !!selectedUserId && pin.length >= 4;

  const handleUnlock = async () => {
    if (!selectedUserId || pin.length < 4 || loading) {
      return;
    }
    const success = await login({ userId: selectedUserId, pin });
    if (success) {
      setPin('');
    }
  };

  if (hasConnectionFailure) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t('app.name')}</ThemedText>
        <View style={[styles.connectionPanel, isWide && styles.formCardWide, { borderColor: palette.border, backgroundColor: palette.inputBackground }]}>
          {error ? <ThemedText style={[styles.errorText, { color: palette.danger }]}>{error}</ThemedText> : null}
          <ThemedText type="defaultSemiBold">{t('settings.connection.title')}</ThemedText>
          <ThemedText style={styles.hint}>{t('settings.connection.subtitle')}</ThemedText>
          <BackendConnectionForm
            onConnected={refreshConnection}
            showScanner={Platform.OS !== 'web'}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={isWide ? styles.formCardWide : undefined}>
      <ThemedText type="title">{t('app.name')}</ThemedText>
      <ThemedText style={styles.helperText}>{t('auth.login.prompt')}</ThemedText>

      <View style={[styles.userRow, isWide && styles.userRowWide]}>
        {users.map((user) => (
          <Pressable
            key={user.id}
            style={[
              styles.userButton,
              isWide && styles.userButtonWide,
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
        numeric="integer"
        maxLength={6}
        label={t('auth.login.pinLabel')}
        placeholder={t('auth.login.pinPlaceholder')}
        style={styles.pinInput}
        onChangeText={setPin}
        onSubmitEditing={() => {
          void handleUnlock();
        }}
      />

      {error ? (
        <ThemedText style={[styles.errorText, { color: palette.danger }]}>{error}</ThemedText>
      ) : null}

      <ThemedButton
        style={styles.loginButton}
        icon="lock-open-outline"
        label={loading ? t('auth.login.signingIn') : t('auth.login.unlock')}
        disabled={!canUnlock}
        onPress={handleUnlock}
      />

      <ThemedText style={[styles.hint, { color: palette.mutedText }]}>
        {t('auth.login.hint')}
      </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  helperText: {
    opacity: 0.92,
    marginBottom: 8,
  },
  formCardWide: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  userRow: {
    gap: 8,
    marginBottom: 8,
  },
  userRowWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  userButtonWide: {
    flexGrow: 1,
    flexBasis: '47%',
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
  errorText: {
    fontWeight: '600',
  },
  hint: {
    opacity: 0.9,
    fontSize: 13,
  },
  connectionPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
});
