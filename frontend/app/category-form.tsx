import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';
import { validateForm } from '@/utils/validation';
import { categoryFormSchema } from '@/utils/validation/schemas';

export default function CategoryFormScreen() {
    const router = useRouter();
    const addCategory = useProductsStore((state) => state.addCategory);

    const [name, setName] = useState('');
    const [nameError, setNameError] = useState('');

    const submitCategory = async () => {
        const result = validateForm(categoryFormSchema, { name });
        if (!result.ok) {
            setNameError(result.errors.name ?? '');
            return;
        }
        setNameError('');

        try {
            await addCategory({ name: name.trim() });
            toast.success(`Categoría "${name.trim()}" creada.`);
            router.back();
        } catch {
            setNameError(t('categoryForm.duplicate'));
        }
    };

    return (
        <FormScreen>
            <ThemedText type="title">{t('categoryForm.title')}</ThemedText>

            <View style={styles.card}>
                <ThemedInput
                    placeholder={t('categoryForm.name')}
                    value={name}
                    onChangeText={setName}
                    error={nameError}
                    style={styles.input}
                />
                <View style={styles.actionsRow}>
                    <ThemedButton style={styles.primaryButton} label={t('categoryForm.save')} onPress={submitCategory} />
                    <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
                </View>
            </View>
        </FormScreen>
    );
}

const styles = StyleSheet.create({
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
