import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { PaymentMethodForm } from '@/components/operations/payment-method-form';
import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { t } from '@/i18n';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

export default function PaymentMethodFormScreen() {
    const router = useRouter();
    const { hydrateAll } = usePaymentMethodsStore();

    useFocusEffect(
        useCallback(() => {
            void hydrateAll();
        }, [hydrateAll]),
    );

    return (
        <FormScreen>
            <ThemedText type="title">{t('settings.paymentMethods.add')}</ThemedText>
            <PaymentMethodForm onClose={() => router.back()} />
        </FormScreen>
    );
}
