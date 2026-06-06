import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { validateForm } from '@/utils/validation';
import { ownerAccountSchema } from '@/utils/validation/schemas';

type SetupOwnerAccountProps = {
  loading: boolean;
  onSubmit: (payload: { name: string; pin: string }) => Promise<void>;
};

export function SetupOwnerAccount({ loading, onSubmit }: SetupOwnerAccountProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canSubmit = useMemo(() => {
    return !loading && name.trim().length > 0 && pin.trim().length >= 4 && pinConfirm.trim().length >= 4;
  }, [loading, name, pin, pinConfirm]);

  async function handleSubmit() {
    const result = validateForm(ownerAccountSchema, { name, pin: pin.trim(), pinConfirm: pinConfirm.trim() });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    await onSubmit({ name: result.data.name, pin: result.data.pin });
  }

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">{t('setup.ownerBootstrap.title')}</ThemedText>
      <ThemedText style={styles.helperText}>{t('setup.ownerBootstrap.helperText')}</ThemedText>

      <ThemedInput
        value={name}
        placeholder={t('setup.ownerBootstrap.namePlaceholder')}
        error={errors.name}
        onChangeText={setName}
      />

      <ThemedInput
        value={pin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        placeholder={t('setup.ownerBootstrap.pinPlaceholder')}
        error={errors.pin}
        onChangeText={setPin}
      />

      <ThemedInput
        value={pinConfirm}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        placeholder={t('setup.ownerBootstrap.pinConfirmPlaceholder')}
        error={errors.pinConfirm}
        onChangeText={setPinConfirm}
      />

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
});
