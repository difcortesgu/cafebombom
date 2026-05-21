import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormFeedback } from '@/components/ui/form-feedback';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type RestockPanelProps = {
    visible: boolean;
    ingredientId: string;
    onClose: () => void;
    onExited: () => void;
};

type RestockForm = {
    ingredientId: string;
    quantityAdded: string;
    cost: string;
    supplierId: string;
    paymentMethodId: string;
};

export function RestockPanel({ visible, ingredientId, onClose, onExited }: RestockPanelProps) {
    const palette = useAppColors();

    const { suppliers, hydrate, addRestock, addSupplier, ingredients } = useInventoryStore();
    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [form, setForm] = useState<RestockForm>({
        ingredientId,
        quantityAdded: '1',
        cost: '0',
        supplierId: '',
        paymentMethodId: '',
    });
    const [message, setMessage] = useState('');
    const paymentInitRef = useRef(false);
    const prevVisibleRef = useRef(false);

    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = visible;

        if (visible && !wasVisible) {
            void hydrate();
            void hydratePaymentMethods();
            paymentInitRef.current = false;

            const ingredient = ingredients.find((i) => i.id === ingredientId);
            setForm({
                ingredientId,
                quantityAdded: '1',
                cost: '0',
                supplierId: ingredient?.supplier_id ?? '',
                paymentMethodId: '',
            });
            setMessage('');
        }
    }, [hydrate, hydratePaymentMethods, ingredientId, ingredients, visible]);

    useEffect(() => {
        if (paymentInitRef.current || methods.length === 0 || !visible) return;
        paymentInitRef.current = true;
        setForm((f) => {
            if (f.paymentMethodId) return f;
            return { ...f, paymentMethodId: methods[0]?.id ?? '' };
        });
    }, [methods, visible]);

    useEffect(() => {
        if (!visible) return;
        setForm((f) => {
            const ingredient = ingredients.find((i) => i.id === f.ingredientId);
            if (!ingredient?.supplier_id || f.supplierId) return f;
            return { ...f, supplierId: ingredient.supplier_id };
        });
    }, [ingredients, visible]);

    const ingredientItems = useMemo(
        () => ingredients.map((i) => ({ label: i.name, value: i.id })),
        [ingredients],
    );

    const supplierItems = useMemo(
        () => [
            { label: t('inventoryForm.restock.noSupplier'), value: '' },
            ...suppliers.map((s) => ({ label: s.name, value: s.id })),
        ],
        [suppliers],
    );

    async function handleSave() {
        if (!form.ingredientId) {
            setMessage(t('inventoryForm.restock.required'));
            return;
        }
        await addRestock({
            ingredientId: form.ingredientId,
            quantityAdded: Number(form.quantityAdded || '0'),
            cost: Number(form.cost || '0'),
            supplierId: form.supplierId || undefined,
            paymentMethodId: form.paymentMethodId,
        });
        onClose();
    }

    return (
        <SlidePanel
            visible={visible}
            title={t('inventoryForm.restock.title')}
            icon="git-branch-outline"
            onClose={onClose}
            onExited={onExited}
            footer={(
                <PanelActionRow
                    primaryLabel={t('inventoryForm.restock.save')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={handleSave}
                    onSecondaryPress={onClose}
                    primaryButtonStyle={styles.saveButton}
                />
            )}
        >
            <FormFeedback message={message} />

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="leaf-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('inventoryForm.restock.ingredient')}</ThemedText>
                </View>
                <ThemedSelect
                    value={form.ingredientId}
                    onValueChange={(val) => {
                        const ingredient = ingredients.find((i) => i.id === val);
                        setForm((f) => ({
                            ...f,
                            ingredientId: val,
                            supplierId: ingredient?.supplier_id ?? '',
                        }));
                    }}
                    items={ingredientItems}
                    placeholder={t('inventoryForm.restock.selectPrompt')}
                    modalTitle={t('inventoryForm.restock.ingredient')}
                />
            </View>

            <View style={styles.twoColRow}>
                <View style={styles.flex1}>
                    <View style={styles.labelRow}>
                        <Ionicons name="layers-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallText}>{t('inventoryForm.restock.quantity')}</ThemedText>
                    </View>
                    <ThemedInput
                        keyboardType="decimal-pad"
                        value={form.quantityAdded}
                        onChangeText={(v) => setForm((f) => ({ ...f, quantityAdded: v }))}
                        style={styles.input}
                    />
                </View>
                <View style={styles.flex1}>
                    <View style={styles.labelRow}>
                        <Ionicons name="pricetag-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallText}>{t('inventoryForm.restock.cost')}</ThemedText>
                    </View>
                    <ThemedInput
                        keyboardType="decimal-pad"
                        value={form.cost}
                        onChangeText={(v) => setForm((f) => ({ ...f, cost: v }))}
                        style={styles.input}
                    />
                </View>
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="card-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('inventoryForm.restock.paymentMethod')}</ThemedText>
                </View>
                <View style={styles.chipRow}>
                    {methods.map((method) => (
                        <Pressable
                            key={method.id}
                            style={[
                                styles.chip,
                                { borderColor: palette.border },
                                form.paymentMethodId === method.id && {
                                    backgroundColor: palette.accent,
                                    borderColor: palette.accent,
                                },
                            ]}
                            onPress={() => setForm((f) => ({ ...f, paymentMethodId: method.id }))}
                        >
                            <Ionicons
                                name={method.icon as any}
                                size={16}
                                color={form.paymentMethodId === method.id ? palette.text : palette.mutedText}
                            />
                            <ThemedText
                                style={[
                                    styles.chipLabel,
                                    form.paymentMethodId === method.id && { color: palette.text },
                                ]}
                            >
                                {method.name}
                            </ThemedText>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="storefront-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallText}>{t('inventoryForm.restock.supplierOptional')}</ThemedText>
                </View>
                <ThemedSelect
                    value={form.supplierId}
                    onValueChange={(val) => setForm((f) => ({ ...f, supplierId: val }))}
                    items={supplierItems}
                    placeholder={t('inventoryForm.restock.noSupplier')}
                    modalTitle={t('inventoryForm.restock.supplierOptional')}
                    onAddNew={async (name) => {
                        const id = await addSupplier({ name: name.trim(), phone: '', notes: '' });
                        if (id) setForm((f) => ({ ...f, supplierId: id }));
                    }}
                    addNewPlaceholder={t('inventoryForm.suppliers.name')}
                    addNewLabel={t('inventory.suppliers.add')}
                />
            </View>
        </SlidePanel>
    );
}

const styles = StyleSheet.create({
    fieldGroup: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    smallText: {
        fontSize: 13,
        opacity: 0.9,
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 10,
    },
    flex1: {
        flex: 1,
        gap: 6,
    },
    input: {
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 8,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
    },
});
