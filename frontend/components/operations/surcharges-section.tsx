import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';

type SurchargesSectionProps = {
    deliveryInput: string;
    toGoInput: string;
    onDeliveryChange: (value: string) => void;
    onToGoChange: (value: string) => void;
    onDeliveryBlur: () => void;
    onToGoBlur: () => void;
};

export function SurchargesSection({
    deliveryInput,
    toGoInput,
    onDeliveryChange,
    onToGoChange,
    onDeliveryBlur,
    onToGoBlur,
}: SurchargesSectionProps) {
    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('settings.fees.title')}</ThemedText>
            <ThemedText style={styles.muted}>{t('settings.fees.subtitle')}</ThemedText>
            <View style={styles.feeRow}>
                <ThemedText style={styles.feeLabel}>{t('settings.fees.delivery')}</ThemedText>
                <ThemedInput
                    style={styles.feeInput}
                    keyboardType="decimal-pad"
                    value={deliveryInput}
                    onChangeText={onDeliveryChange}
                    onBlur={onDeliveryBlur}
                    placeholder={t('settings.fees.placeholder')}
                />
            </View>
            <View style={styles.feeRow}>
                <ThemedText style={styles.feeLabel}>{t('settings.fees.toGo')}</ThemedText>
                <ThemedInput
                    style={styles.feeInput}
                    keyboardType="decimal-pad"
                    value={toGoInput}
                    onChangeText={onToGoChange}
                    onBlur={onToGoBlur}
                    placeholder={t('settings.fees.placeholder')}
                />
            </View>
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    feeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    feeLabel: {
        flex: 1,
    },
    feeInput: {
        width: 120,
        textAlign: 'right',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
