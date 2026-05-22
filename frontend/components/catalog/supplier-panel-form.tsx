import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

export type SupplierPanelFormProps = {
    mode: 'create' | { supplierId: string };
    onClose: () => void;
};

export function SupplierPanelForm({ mode, onClose }: SupplierPanelFormProps) {
    const palette = useAppColors();
    const { suppliers, addSupplier, updateSupplier } = useInventoryStore();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState('');

    const isEdit = mode !== 'create';

    useEffect(() => {
        setMessage('');
        if (mode === 'create') {
            setName('');
            setPhone('');
            setNotes('');
        } else {
            const item = suppliers.find((s) => s.id === mode.supplierId);
            if (item) {
                setName(item.name);
                setPhone(item.phone ?? '');
                setNotes(item.notes ?? '');
            }
        }
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    async function submit() {
        if (!name.trim()) { setMessage(t('inventoryForm.suppliers.required')); return; }
        if (mode === 'create') {
            await addSupplier({ name: name.trim(), phone: phone.trim() || undefined, notes: notes.trim() || undefined });
        } else {
            await updateSupplier({ id: mode.supplierId, name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
        }
        onClose();
    }

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="business-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">
                        {isEdit ? t('catalog.panel.editSupplier') : t('inventoryForm.suppliers.title')}
                    </ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                {message ? (
                    <View style={[styles.messageBanner, { backgroundColor: palette.danger + '22', borderColor: palette.danger + '44' }]}>
                        <ThemedText style={{ color: palette.danger, fontSize: 13 }}>{message}</ThemedText>
                    </View>
                ) : null}

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="business-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('inventoryForm.suppliers.name')}</ThemedText>
                    </View>
                    <ThemedInput value={name} onChangeText={setName} style={styles.input} />
                </View>

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="call-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('inventoryForm.suppliers.phone')}</ThemedText>
                    </View>
                    <ThemedInput keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={styles.input} />
                </View>

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="document-text-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('inventoryForm.suppliers.notes')}</ThemedText>
                    </View>
                    <ThemedInput value={notes} onChangeText={setNotes} style={styles.input} multiline />
                </View>
            </ScrollView>

            <View style={[styles.panelFooter, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                <ThemedButton
                    style={styles.saveButton}
                    label={isEdit ? t('common.saveChanges') : t('inventoryForm.suppliers.save')}
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
