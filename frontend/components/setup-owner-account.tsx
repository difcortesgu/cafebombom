import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';

type SetupOwnerAccountProps = {
  loading: boolean;
  onSubmit: (payload: { name: string; pin: string }) => Promise<void>;
};

export function SetupOwnerAccount({ loading, onSubmit }: SetupOwnerAccountProps) {
  const palette = useAppColors();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !loading && name.trim().length > 0 && pin.trim().length >= 4 && pinConfirm.trim().length >= 4;
  }, [loading, name, pin, pinConfirm]);

  async function handleSubmit() {
    const cleanName = name.trim();
    const cleanPin = pin.trim();
    const cleanPinConfirm = pinConfirm.trim();

    if (!cleanName || cleanPin.length < 4 || cleanPinConfirm.length < 4) {
      return;
    }

    if (cleanPin !== cleanPinConfirm) {
      setLocalError(t('setup.ownerBootstrap.pinMismatch'));
      return;
    }

    setLocalError(null);
    await onSubmit({ name: cleanName, pin: cleanPin });
  }

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">{t('setup.ownerBootstrap.title')}</ThemedText>
      <ThemedText style={styles.helperText}>{t('setup.ownerBootstrap.helperText')}</ThemedText>

      <ThemedInput
        value={name}
        placeholder={t('setup.ownerBootstrap.namePlaceholder')}
        onChangeText={setName}
      />

      <ThemedInput
        value={pin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        placeholder={t('setup.ownerBootstrap.pinPlaceholder')}
        onChangeText={setPin}
      />

      <ThemedInput
        value={pinConfirm}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        placeholder={t('setup.ownerBootstrap.pinConfirmPlaceholder')}
        onChangeText={setPinConfirm}
      />

      {localError ? (
        <ThemedText style={[styles.errorText, { color: palette.danger }]}>{localError}</ThemedText>
      ) : null}

      <ThemedButton
        label={loading ? t('setup.ownerBootstrap.creating') : t('setup.ownerBootstrap.createAction')}
        disabled={!canSubmit}
        onPress={() => void handleSubmit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  helperText: {
    opacity: 0.9,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
