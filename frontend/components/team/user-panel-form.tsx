import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormFeedback } from '@/components/ui/form-feedback';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ThemedInput } from '@/components/ui/themed-input';
import { useFormPanel } from '@/hooks/use-form-panel';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import type { ManagedUser } from '@/types/auth';

type UserPanelFormProps = {
    visible: boolean;
    onClose: () => void;
    onExited: () => void;
    editingUser?: ManagedUser;
};

type UserForm = {
    name: string;
    role: 'owner' | 'staff';
    pin: string;
};

const DEFAULT_FORM: UserForm = {
    name: '',
    role: 'staff',
    pin: '',
};

export function UserPanelForm({ visible, onClose, onExited, editingUser }: UserPanelFormProps) {
    const palette = useAppColors();
    const { createUser, setupUpdateUser } = useAuthStore();
    const { form, setForm, message, setMessage } = useFormPanel<UserForm>({
        visible,
        createDefaultForm: () =>
            editingUser
                ? { name: editingUser.name, role: editingUser.role, pin: '' }
                : DEFAULT_FORM,
    });

    const isEditing = !!editingUser;

    async function handleSave() {
        if (!form.name.trim()) {
            setMessage(t('setup.account.namePlaceholder'));
            return;
        }
        if (!isEditing && !form.pin.trim()) {
            setMessage(t('setup.account.pinPlaceholder'));
            return;
        }
        if (isEditing) {
            const updated = await setupUpdateUser(editingUser.id, {
                name: form.name.trim(),
                role: form.role,
                pin: form.pin.trim() || undefined,
            });
            if (!updated) return;
        } else {
            const created = await createUser({ name: form.name.trim(), role: form.role, pin: form.pin.trim() });
            if (!created) return;
        }
        onClose();
    }

    return (
        <SlidePanel
            visible={visible}
            onClose={onClose}
            onExited={onExited}
            title={isEditing ? t('setup.account.editTitle') : t('setup.account.add')}
            icon="person-outline"
            footer={
                <PanelActionRow
                    primaryLabel={isEditing ? t('setup.account.update') : t('setup.account.add')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={handleSave}
                    onSecondaryPress={onClose}
                />
            }
        >
            <ThemedInput
                value={form.name}
                placeholder={t('setup.account.namePlaceholder')}
                onChangeText={(val) => setForm((prev) => ({ ...prev, name: val }))}
            />
            <View style={styles.chipRow}>
                {(['owner', 'staff'] as const).map((role) => (
                    <Pressable
                        key={role}
                        style={[
                            styles.chip,
                            { borderColor: palette.border, backgroundColor: palette.inputBackground },
                            form.role === role && { backgroundColor: palette.accent, borderColor: palette.accent },
                        ]}
                        onPress={() => setForm((prev) => ({ ...prev, role }))}
                    >
                        <ThemedText style={form.role === role ? { color: palette.text } : { color: palette.mutedText }}>
                            {role === 'owner' ? t('auth.role.owner') : t('auth.role.staff')}
                        </ThemedText>
                    </Pressable>
                ))}
            </View>
            <ThemedInput
                value={form.pin}
                placeholder={isEditing ? t('setup.account.pinPlaceholderEdit') : t('setup.account.pinPlaceholder')}
                keyboardType="number-pad"
                secureTextEntry
                onChangeText={(val) => setForm((prev) => ({ ...prev, pin: val }))}
            />
            <FormFeedback message={message} />
        </SlidePanel>
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
});
