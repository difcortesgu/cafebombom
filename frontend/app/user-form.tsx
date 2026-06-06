import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { validateForm } from '@/utils/validation';
import { userFormSchema } from '@/utils/validation/schemas';

export default function UserFormScreen() {
    const router = useRouter();
    const palette = useAppColors();
    const params = useLocalSearchParams<{ id?: string }>();

    const { managedUsers, createUser, setupUpdateUser } = useAuthStore();

    const editingUser = params.id ? managedUsers.find((u) => u.id === params.id) : undefined;
    const isEditing = editingUser !== undefined;

    const [name, setName] = useState(editingUser?.name ?? '');
    const [role, setRole] = useState<'owner' | 'staff'>(editingUser?.role ?? 'staff');
    const [pin, setPin] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    async function handleSave() {
        const result = validateForm(userFormSchema(isEditing), { name, role, pin });
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setErrors({});
        if (isEditing && editingUser) {
            const updated = await setupUpdateUser(editingUser.id, {
                name: name.trim(),
                role,
                pin: pin.trim() || undefined,
            });
            if (!updated) return;
        } else {
            const created = await createUser({ name: name.trim(), role, pin: pin.trim() });
            if (!created) return;
        }
        router.back();
    }

    return (
        <FormScreen>
            <ThemedText type="title">
                {isEditing ? t('setup.account.editTitle') : t('setup.account.add')}
            </ThemedText>

            <ThemedCard style={styles.card}>
                <ThemedInput
                    value={name}
                    placeholder={t('setup.account.namePlaceholder')}
                    error={errors.name}
                    onChangeText={setName}
                />

                <View style={styles.chipRow}>
                    {(['owner', 'staff'] as const).map((r) => (
                        <Pressable
                            key={r}
                            style={[
                                styles.chip,
                                { borderColor: palette.border, backgroundColor: palette.inputBackground },
                                role === r && { backgroundColor: palette.accent, borderColor: palette.accent },
                            ]}
                            onPress={() => setRole(r)}
                        >
                            <ThemedText
                                style={role === r ? { color: palette.text } : { color: palette.mutedText }}
                            >
                                {r === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}
                            </ThemedText>
                        </Pressable>
                    ))}
                </View>

                <ThemedInput
                    value={pin}
                    placeholder={isEditing ? t('setup.account.pinPlaceholderEdit') : t('setup.account.pinPlaceholder')}
                    keyboardType="number-pad"
                    secureTextEntry
                    error={errors.pin}
                    onChangeText={setPin}
                />

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={isEditing ? t('setup.account.update') : t('setup.account.add')}
                        onPress={() => void handleSave()}
                    />
                    <ThemedButton
                        variant="secondary"
                        style={styles.secondaryButton}
                        icon="arrow-back"
                        label={t('common.back')}
                        onPress={() => router.back()}
                    />
                </View>
            </ThemedCard>
        </FormScreen>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 12,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    primaryButton: {
        flex: 1,
    },
    secondaryButton: {
        flex: 1,
    },
});
