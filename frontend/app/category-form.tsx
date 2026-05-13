import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';

export default function CategoryFormScreen() {
    const router = useRouter();
    const addCategory = useProductsStore((state) => state.addCategory);

    const [name, setName] = useState('');
    const [message, setMessage] = useState('');

    const submitCategory = async () => {
        if (!name.trim()) {
            setMessage(t('categoryForm.required'));
            return;
        }

        const categoryId = await addCategory({ name: name.trim() });
        if (!categoryId) {
            setMessage(t('categoryForm.duplicate'));
            return;
        }

        router.back();
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('categoryForm.title')}</ThemedText>

            {message ? (
                <ThemedCard style={styles.messageCard}>
                    <ThemedText>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
                <ThemedInput
                    placeholder={t('categoryForm.name')}
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                />
                <View style={styles.actionsRow}>
                    <ThemedButton style={styles.primaryButton} label={t('categoryForm.save')} onPress={submitCategory} />
                    <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
                </View>
            </ThemedCard>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    messageCard: {
        padding: 12,
    },
    card: {
        gap: 10,
    },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    primaryButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    secondaryButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
});
