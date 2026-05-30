import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { User } from '@/types/types';

type UserAccountModalMode = 'add' | 'edit';

export type UserAccountModalPayload = {
  name: string;
  role: 'owner' | 'staff';
  pin?: string;
};

type UserAccountModalProps = {
  visible: boolean;
  mode: UserAccountModalMode;
  loading: boolean;
  initialUser?: User | null;
  onClose: () => void;
  onSubmit: (payload: UserAccountModalPayload) => Promise<boolean>;
};

export function UserAccountModal({
  visible,
  mode,
  loading,
  initialUser,
  onClose,
  onSubmit,
}: UserAccountModalProps) {
  const palette = useAppColors();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('staff');

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (mode === 'edit' && initialUser) {
      setName(initialUser.name);
      setRole(initialUser.role);
      setPin('');
      return;
    }

    setName('');
    setPin('');
    setRole('staff');
  }, [visible, mode, initialUser]);

  const isAddDisabled = loading || name.trim().length === 0 || pin.trim().length < 4;
  const isEditDisabled = loading || name.trim().length === 0 || (pin.trim().length > 0 && pin.trim().length < 4);

  const submit = async () => {
    const payload: UserAccountModalPayload = {
      name,
      role,
      pin: pin.trim().length > 0 ? pin : undefined,
    };

    const ok = await onSubmit(payload);
    if (ok) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ThemedCard style={styles.modalCard}>
          <ThemedText type="subtitle">
            {mode === 'add' ? t('setup.account.addTitle') : t('setup.account.editTitle')}
          </ThemedText>

          <ThemedInput
            value={name}
            placeholder={t('setup.account.namePlaceholder')}
            onChangeText={setName}
          />

          <View style={styles.roleRow}>
            {(['owner', 'staff'] as const).map((nextRole) => {
              const active = role === nextRole;
              return (
                <Pressable
                  key={nextRole}
                  style={[
                    styles.roleButton,
                    { borderColor: palette.border },
                    active ? { backgroundColor: palette.tint, borderColor: palette.tint } : null,
                  ]}
                  onPress={() => setRole(nextRole)}>
                  <ThemedText style={active ? { color: palette.card, fontWeight: '700' } : null}>
                    {nextRole === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedInput
            value={pin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            placeholder={mode === 'edit' ? t('setup.account.pinPlaceholderEdit') : t('setup.account.pinPlaceholder')}
            onChangeText={setPin}
          />

          <View style={styles.modalActions}>
            <ThemedButton
              label={loading ? t('setup.account.saving') : mode === 'add' ? t('setup.account.add') : t('setup.account.update')}
              disabled={mode === 'add' ? isAddDisabled : isEditDisabled}
              onPress={() => void submit()}
            />
            <ThemedButton variant="secondary" label={t('setup.modal.cancel')} onPress={onClose} />
          </View>
        </ThemedCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    gap: 10,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});