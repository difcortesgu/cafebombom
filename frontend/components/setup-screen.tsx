import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SetupOwnerAccount } from '@/components/setup-owner-account';
import { SetupStepTwo } from '@/components/setup-screen/setup-step-two';
import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { CreateUserPayload, LoginPayload, ManagedUser, SetupUpdateUserPayload } from '@/types/auth';
import type { User } from '@/types/types';

interface SetupScreenProps {
  users: ManagedUser[];
  loading: boolean;
  error: string | null;
  createUser: (payload: CreateUserPayload) => Promise<User | null>;
  updateUser: (userId: string, payload: SetupUpdateUserPayload) => Promise<User | null>;
  deleteUser: (userId: string) => Promise<boolean>;
  reactivateUser: (userId: string) => Promise<boolean>;
  hardDeleteUser: (userId: string) => Promise<boolean>;
  hasOwnerAccount: boolean;
  hasOwnerSession: boolean;
  login: (payload: LoginPayload) => Promise<boolean>;
  hydrateInventory: () => Promise<void>;
  hydrateProducts: () => Promise<void>;
  onFinish: () => void;
}

type SetupStep = 1 | 2;

export function SetupScreen({
  users,
  loading,
  error,
  createUser,
  updateUser,
  deleteUser,
  reactivateUser,
  hardDeleteUser,
  hasOwnerAccount,
  hasOwnerSession,
  login,
  hydrateInventory,
  hydrateProducts,
  onFinish,
}: SetupScreenProps) {
  const palette = useAppColors();
  const [step, setStep] = useState<SetupStep>(1);
  const [ownerSessionReady, setOwnerSessionReady] = useState(hasOwnerSession);

  useEffect(() => {
    setOwnerSessionReady(hasOwnerSession);
  }, [hasOwnerSession]);

  useEffect(() => {
    if (step === 1 && hasOwnerAccount && ownerSessionReady) {
      setStep(2);
    }
  }, [step, hasOwnerAccount, ownerSessionReady]);

  const handleOwnerLogin = async (userId: string, pin: string): Promise<boolean> => {
    const signedIn = await login({ userId, pin });
    setOwnerSessionReady(signedIn);
    return signedIn;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('app.name')}</ThemedText>
      <ThemedText style={styles.helperText}>
        {step === 1 ? t('setup.step1.helperText') : t('setup.step2.helperText')}
      </ThemedText>

      <View style={styles.stepPills}>
        <View style={[styles.stepPill, step === 1 ? { backgroundColor: palette.tint } : { borderColor: palette.border, borderWidth: 1 }]}>
          <ThemedText style={step === 1 ? { color: palette.card, fontWeight: '700' } : undefined}>
            {t('setup.step1.title')}
          </ThemedText>
        </View>
        <View style={[styles.stepPill, step === 2 ? { backgroundColor: palette.tint } : { borderColor: palette.border, borderWidth: 1 }]}>
          <ThemedText style={step === 2 ? { color: palette.card, fontWeight: '700' } : undefined}>
            {t('setup.step2.title')}
          </ThemedText>
        </View>
      </View>

      {step === 1 ? (
        <SetupOwnerAccount
          loading={loading}
          onSubmit={async ({ name, pin }) => {
            const created = await createUser({ name, role: 'owner', pin });
            if (!created) return;
            const signedIn = await handleOwnerLogin(created.id, pin);
            if (signedIn) setStep(2);
          }}
        />
      ) : (
        <SetupStepTwo
          users={users}
          loading={loading}
          error={error}
          ownerSessionReady={ownerSessionReady}
          createUser={createUser}
          updateUser={updateUser}
          deleteUser={deleteUser}
          reactivateUser={reactivateUser}
          hardDeleteUser={hardDeleteUser}
          hydrateInventory={hydrateInventory}
          hydrateProducts={hydrateProducts}
          onOwnerLogin={handleOwnerLogin}
          onFinish={onFinish}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 12,
  },
  helperText: {
    opacity: 0.92,
    marginBottom: 4,
  },
  stepPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stepPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
});
