import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

type Props = {
    onClose?: () => void;
    compact?: boolean;
};

export function PaymentMethodsManager({ onClose, compact = false }: Props) {
    const { methods, hydrate, addMethod, deleteMethod } = usePaymentMethodsStore();
    const [newMethodName, setNewMethodName] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    const handleAddMethod = useCallback(async () => {
        if (!newMethodName.trim()) {
            setMessage(t('common.required'));
            return;
        }

        setLoading(true);
        try {
            const success = await addMethod(newMethodName.trim());
            if (success) {
                setNewMethodName('');
                setMessage('');
            } else {
                setMessage(t('common.error'));
            }
        } finally {
            setLoading(false);
        }
    }, [newMethodName, addMethod]);

    const handleDeleteMethod = useCallback(
        async (id: string) => {
            setLoading(true);
            try {
                await deleteMethod(id);
            } finally {
                setLoading(false);
            }
        },
        [deleteMethod],
    );

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <ThemedText type="subtitle">{t('settings.paymentMethods.title')}</ThemedText>

                {message ? (
                    <ThemedText style={[styles.message, styles.error]}>{message}</ThemedText>
                ) : null}

                <View style={styles.inputRow}>
                    <ThemedInput
                        placeholder={t('settings.paymentMethods.name')}
                        value={newMethodName}
                        onChangeText={setNewMethodName}
                        style={styles.compactInput}
                        editable={!loading}
                    />
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
                                <ThemedText style={styles.methodName}>{method.name}</ThemedText>
                                <ThemedButton
                                    variant="secondary"
                                    label={t('common.delete')}
                                    onPress={() => handleDeleteMethod(method.id)}
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
                <View style={styles.inputRow}>
                    <ThemedInput
                        placeholder={t('settings.paymentMethods.name')}
                        value={newMethodName}
                        onChangeText={setNewMethodName}
                        style={styles.input}
                        editable={!loading}
                    />
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
                            <ThemedText style={styles.methodName}>{method.name}</ThemedText>
                            <ThemedButton
                                variant="secondary"
                                label={t('common.delete')}
                                onPress={() => handleDeleteMethod(method.id)}
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
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    button: {
        paddingVertical: 10,
    },
    compactButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
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
    methodName: {
        flex: 1,
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
