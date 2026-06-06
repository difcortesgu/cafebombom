import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormFeedback } from '@/components/ui/form-feedback';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedInput } from '@/components/ui/themed-input';
import { PAYMENT_ICONS } from '@/constants/payment-icons';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { validateForm } from '@/utils/validation';
import { paymentMethodFormSchema } from '@/utils/validation/schemas';

export type PaymentMethodFormProps = {
    onClose: () => void;
    method?: { id: string; name: string; icon: string; is_active: boolean };
};

export function PaymentMethodForm({ onClose, method }: PaymentMethodFormProps) {
    const palette = useAppColors();
    const { addMethod, updateMethod, hydrateAll } = usePaymentMethodsStore();
    const isEditing = !!method;

    const [name, setName] = useState(method?.name ?? '');
    const [selectedIcon, setSelectedIcon] = useState(method?.icon ?? 'wallet');
    const [message, setMessage] = useState('');
    const [nameError, setNameError] = useState('');

    async function submit() {
        const result = validateForm(paymentMethodFormSchema, { name, icon: selectedIcon });
        if (!result.ok) {
            setNameError(result.errors.name ?? '');
            return;
        }
        setNameError('');
        if (isEditing && method) {
            const ok = await updateMethod(method.id, name.trim(), method.is_active, selectedIcon);
            if (!ok) {
                setMessage(t('common.error'));
                return;
            }
        } else {
            const id = await addMethod(name.trim(), selectedIcon);
            if (!id) {
                setMessage(t('common.error'));
                return;
            }
        }
        await hydrateAll();
        onClose();
    }

    return (
        <>
            <FormFeedback message={message} />

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('settings.paymentMethods.name')}</ThemedText>
                </View>
                <ThemedInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('settings.paymentMethods.name')}
                    error={nameError}
                />
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="shapes-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>Icono</ThemedText>
                </View>
                <View style={styles.iconGrid}>
                    {PAYMENT_ICONS.map((icon) => {
                        const selected = selectedIcon === icon.name;
                        return (
                            <Pressable
                                key={icon.name}
                                style={[
                                    styles.iconOption,
                                    { borderColor: selected ? palette.tint : palette.border },
                                    selected && { backgroundColor: `${palette.tint}22` },
                                ]}
                                onPress={() => setSelectedIcon(icon.name)}
                            >
                                <Ionicons
                                    name={icon.name as any}
                                    size={22}
                                    color={selected ? palette.tint : palette.text}
                                />
                                <ThemedText style={[styles.iconLabel, selected && { color: palette.tint }]}>
                                    {icon.label}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.actionsRow}>
                <PanelActionRow
                    primaryLabel={isEditing ? t('common.saveChanges') : t('settings.paymentMethods.addButton')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={() => void submit()}
                    onSecondaryPress={onClose}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    fieldGroup: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    smallLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    iconOption: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    iconLabel: {
        fontSize: 11,
        opacity: 0.7,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
});
