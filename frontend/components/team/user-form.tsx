import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import type { ManagedUser } from '@/types/auth';
import { validateForm } from '@/utils/validation';
import { userFormSchema } from '@/utils/validation/schemas';

export type UserFormProps = {
    editingUser?: ManagedUser;
    onClose: () => void;
};

export function UserForm({ editingUser, onClose }: UserFormProps) {
    const palette = useAppColors();
    const { createUser, setupUpdateUser } = useAuthStore();

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
        onClose();
    }

    return (
        <>
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
                        <ThemedText style={role === r ? { color: palette.text } : { color: palette.mutedText }}>
                            {r === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}
                        </ThemedText>
                    </Pressable>
                ))}
            </View>
            <ThemedInput
                value={pin}
                placeholder={isEditing ? t('setup.account.pinPlaceholderEdit') : t('setup.account.pinPlaceholder')}
                numeric="integer"
                secureTextEntry
                error={errors.pin}
                onChangeText={setPin}
            />
            <View style={styles.actionsRow}>
                <PanelActionRow
                    primaryLabel={isEditing ? t('setup.account.update') : t('setup.account.add')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={() => void handleSave()}
                    onSecondaryPress={onClose}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
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
});
