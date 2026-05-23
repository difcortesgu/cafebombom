import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { PAYMENT_ICONS } from '@/constants/payment-icons';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type PaymentMethodPanelFormProps = {
    onClose: () => void;
};

export function PaymentMethodPanelForm({ onClose }: PaymentMethodPanelFormProps) {
    const palette = useAppColors();
    const { addMethod, hydrateAll } = usePaymentMethodsStore();

    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('wallet');
    const [message, setMessage] = useState('');

    async function submit() {
        if (!name.trim()) { setMessage(t('common.required')); return; }
        const id = await addMethod(name.trim(), selectedIcon);
        if (!id) { setMessage(t('common.error')); return; }
        await hydrateAll();
        onClose();
    }

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="card-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">{t('settings.paymentMethods.add')}</ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                {message ? (
                    <View style={[styles.messageBanner, { backgroundColor: `${palette.danger}22`, borderColor: `${palette.danger}44` }]}>
                        <ThemedText style={{ color: palette.danger, fontSize: 13 }}>{message}</ThemedText>
                    </View>
                ) : null}

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('settings.paymentMethods.name')}</ThemedText>
                    </View>
                    <ThemedInput
                        value={name}
                        onChangeText={setName}
                        placeholder={t('settings.paymentMethods.name')}
                        style={styles.input}
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
            </ScrollView>

            <View style={[styles.panelFooter, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                <ThemedButton
                    style={styles.saveButton}
                    label={t('settings.paymentMethods.addButton')}
                    icon="checkmark-circle"
                    onPress={() => void submit()}
                />
                <ThemedButton
                    variant="secondary"
                    label={t('common.back')}
                    onPress={onClose}
                    style={styles.backButton}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    panelHeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    panelContent: {
        padding: 16,
        gap: 14,
    },
    messageBanner: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
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
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
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
    panelFooter: {
        padding: 14,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 10,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
});
