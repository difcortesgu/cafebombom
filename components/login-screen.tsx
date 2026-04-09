import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
}

export function LoginScreen({ users, loading, error, login }: LoginScreenProps) {
  const palette = useAppColors();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    users.length > 0 ? users[0].id : null,
  );
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (users.length > 0 && selectedUserId === null) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

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

  return (
    <ThemedView style={styles.container}>
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
          void handleUnlock();
        }}
      />

      {error ? (
        <ThemedText style={[styles.errorText, { color: palette.danger }]}>{error}</ThemedText>
      ) : null}

      <ThemedButton
        style={styles.loginButton}
        disabled={!canUnlock}
        onPress={handleUnlock}>
        <View style={styles.loginButtonContent}>
          <IconSymbol name="lock.fill" size={16} color={palette.card} />
          <ThemedText style={[styles.buttonText, { color: palette.card }]}>
            {loading ? t('auth.login.signingIn') : t('auth.login.unlock')}
          </ThemedText>
        </View>
      </ThemedButton>

      <ThemedText style={[styles.hint, { color: palette.mutedText }]}>
        {t('auth.login.hint')}
      </ThemedText>
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
  buttonText: {
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
});
