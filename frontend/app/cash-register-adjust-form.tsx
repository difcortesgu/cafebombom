import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { CashRegisterAdjustPanelContent } from '@/components/operations/cash-register-history-section';
import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';

export default function CashRegisterAdjustFormScreen() {
    const router = useRouter();
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
    const { cashRegisterHistory, loadCashRegisterHistory } = useAccountsStore();

    useFocusEffect(
        useCallback(() => {
            void loadCashRegisterHistory();
        }, [loadCashRegisterHistory]),
    );

    const day = cashRegisterHistory.find((d) => d.id === sessionId) ?? null;

    if (!day) {
        return (
            <FormScreen>
                <ThemedText>{t('cashRegister.dayNotFound')}</ThemedText>
            </FormScreen>
        );
    }

    return (
        <View style={styles.container}>
            <CashRegisterAdjustPanelContent day={day} onClose={() => router.back()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
