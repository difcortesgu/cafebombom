import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { PAYMENT_ICONS } from '@/constants/payment-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type Props = {
    onClose?: () => void;
    compact?: boolean;
};

export function PaymentMethodsManager({ onClose, compact = false }: Props) {
    const { methods, hydrate, hydrateAll, addMethod, toggleMethod } = usePaymentMethodsStore();
    const [newMethodName, setNewMethodName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('wallet');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const textColor = useThemeColor({}, 'text');

    useEffect(() => {
        if (compact) {
            void hydrate();
        } else {
            void hydrateAll();
        }
    }, [hydrate, hydrateAll, compact]);

    const handleAddMethod = useCallback(async () => {
        if (!newMethodName.trim()) {
            setMessage(t('common.required'));
            return;
        }

        setLoading(true);
        try {
            const success = await addMethod(newMethodName.trim(), selectedIcon);
            if (success) {
                setNewMethodName('');
                setSelectedIcon('wallet');
                setMessage('');
            } else {
                setMessage(t('common.error'));
            }
        } finally {
            setLoading(false);
        }
    }, [newMethodName, selectedIcon, addMethod]);

    const handleToggleMethod = useCallback(
        async (id: string, isActive: boolean) => {
            setLoading(true);
            try {
                await toggleMethod(id, isActive);
            } finally {
                setLoading(false);
            }
        },
        [toggleMethod],
    );

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <ThemedText type="subtitle">{t('settings.paymentMethods.title')}</ThemedText>

                {message ? (
                    <ThemedText style={[styles.message, styles.error]}>{message}</ThemedText>
                ) : null}

                <ThemedInput
                    placeholder={t('settings.paymentMethods.name')}
                    value={newMethodName}
                    onChangeText={setNewMethodName}
                    style={styles.compactInput}
                    editable={!loading}
                />

                <View style={styles.iconSelectorCompact}>
                    <ThemedText style={styles.iconPickerLabelCompact}>Icono:</ThemedText>
                    <ScrollView style={styles.iconPickerContainerCompact} horizontal showsHorizontalScrollIndicator={false}>
                        {PAYMENT_ICONS.map((icon) => (
                            <Pressable
                                key={icon.name}
                                onPress={() => setSelectedIcon(icon.name)}
                                disabled={loading}
                                style={[
                                    styles.iconOptionCompact,
                                    selectedIcon === icon.name && styles.iconOptionSelectedCompact,
                                ]}
                            >
                                <Ionicons name={icon.name as any} size={20} color={textColor} />
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.inputRow}>
                    <ThemedButton
                        label={t('settings.paymentMethods.addButton')}
                        onPress={handleAddMethod}
                        disabled={loading}
                        style={styles.compactButton}
                    />
                </View>

                <View style={styles.methodsList}>
                    {methods.length === 0 ? (
                        <ThemedText style={styles.emptyText}>{t('settings.paymentMethods.empty')}</ThemedText>
                    ) : (
                        methods.map((method) => (
                            <View key={method.id} style={styles.methodRow}>
                                <View style={styles.methodContent}>
                                    <Ionicons name={method.icon as any} size={20} color={textColor} />
                                    <View style={styles.methodInfo}>
                                        <ThemedText style={styles.methodName}>{method.name}</ThemedText>
                                        {!method.is_active && (
                                            <ThemedText style={styles.inactiveLabel}>Deshabilitado</ThemedText>
                                        )}
                                    </View>
                                </View>
                                <ThemedButton
                                    variant="secondary"
                                    label={method.is_active ? t('common.disable') : t('common.enable')}
                                    onPress={() => handleToggleMethod(method.id, method.is_active)}
                                    disabled={loading}
                                    style={styles.deleteButton}
                                />
                            </View>
                        ))
                    )}
                </View>

                {onClose ? (
                    <ThemedButton
                        variant="secondary"
                        label={t('common.close')}
                        onPress={onClose}
                        style={styles.compactButton}
                    />
                ) : null}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ThemedText type="title">{t('settings.paymentMethods.title')}</ThemedText>

            {message ? (
                <ThemedText style={[styles.message, styles.error]}>{message}</ThemedText>
            ) : null}

            <View style={styles.section}>
                <ThemedText type="subtitle">{t('settings.paymentMethods.add')}</ThemedText>
                <ThemedInput
                    placeholder={t('settings.paymentMethods.name')}
                    value={newMethodName}
                    onChangeText={setNewMethodName}
                    style={styles.input}
                    editable={!loading}
                />

                <View style={styles.iconSelectorContainer}>
                    <ThemedText style={styles.iconPickerLabel}>Selecciona un icono:</ThemedText>
                    <ScrollView style={styles.iconPickerContainer} horizontal showsHorizontalScrollIndicator={false}>
                        {PAYMENT_ICONS.map((icon) => (
                            <Pressable
                                key={icon.name}
                                onPress={() => setSelectedIcon(icon.name)}
                                disabled={loading}
                                style={[
                                    styles.iconOption,
                                    selectedIcon === icon.name && styles.iconOptionSelected,
                                ]}
                            >
                                <View style={styles.iconWrapper}>
                                    <Ionicons name={icon.name as any} size={28} color={textColor} />
                                </View>
                                <ThemedText style={styles.iconLabel}>{icon.label}</ThemedText>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.inputRow}>
                    <ThemedButton
                        label={t('settings.paymentMethods.addButton')}
                        onPress={handleAddMethod}
                        disabled={loading}
                        style={styles.button}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <ThemedText type="subtitle">{t('settings.paymentMethods.list')}</ThemedText>
                {methods.length === 0 ? (
                    <ThemedText style={styles.emptyText}>{t('settings.paymentMethods.empty')}</ThemedText>
                ) : (
                    methods.map((method) => (
                        <View key={method.id} style={styles.methodRow}>
                            <View style={styles.methodContent}>
                                <Ionicons name={method.icon as any} size={24} color={textColor} />
                                <View style={styles.methodInfo}>
                                    <ThemedText style={styles.methodName}>{method.name}</ThemedText>
                                    {!method.is_active && (
                                        <ThemedText style={styles.inactiveLabel}>Deshabilitado</ThemedText>
                                    )}
                                </View>
                            </View>
                            <ThemedButton
                                variant="secondary"
                                label={method.is_active ? t('common.disable') : t('common.enable')}
                                onPress={() => handleToggleMethod(method.id, method.is_active)}
                                disabled={loading}
                                style={styles.deleteButton}
                            />
                        </View>
                    ))
                )}
            </View>

            {onClose ? (
                <ThemedButton
                    variant="secondary"
                    label={t('common.close')}
                    onPress={onClose}
                    style={styles.button}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    compactContainer: {
        gap: 10,
    },
    section: {
        gap: 10,
    },
    input: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    compactInput: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 8,
    },
    iconSelectorCompact: {
        gap: 6,
        marginBottom: 8,
    },
    iconPickerLabelCompact: {
        fontSize: 11,
        opacity: 0.7,
    },
    iconPickerContainerCompact: {
        flexDirection: 'row',
    },
    iconOptionCompact: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginRight: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    iconOptionSelectedCompact: {
        borderColor: 'rgba(0, 0, 0, 0.3)',
    },
    button: {
        paddingVertical: 10,
    },
    compactButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    iconSelectorContainer: {
        marginVertical: 10,
        gap: 8,
    },
    iconPickerLabel: {
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 4,
    },
    iconPickerContainer: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    iconOption: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginRight: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: 6,
    },
    iconOptionSelected: {
        borderColor: 'rgba(0, 0, 0, 0.3)',
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconLabel: {
        fontSize: 11,
        opacity: 0.7,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    methodsList: {
        gap: 8,
    },
    methodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    methodContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    methodInfo: {
        flex: 1,
        gap: 2,
    },
    methodName: {
        flex: 1,
    },
    inactiveLabel: {
        fontSize: 11,
        opacity: 0.5,
        fontStyle: 'italic',
    },
    deleteButton: {
        paddingVertical: 6,
    },
    emptyText: {
        opacity: 0.6,
        fontSize: 13,
    },
    message: {
        fontSize: 13,
        paddingVertical: 8,
    },
    error: {
        color: '#ff4444',
    },
});
