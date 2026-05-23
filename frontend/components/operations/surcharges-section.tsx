import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
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
    const palette = useAppColors();

    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('settings.fees.title')}</ThemedText>
            <ThemedText style={styles.muted}>{t('settings.fees.subtitle')}</ThemedText>
            <View style={styles.feeControl}>
                <ThemedText style={styles.feeLabel}>{t('settings.fees.delivery')}</ThemedText>
                <ThemedInput
                    style={styles.compactInput}
                    keyboardType="decimal-pad"
                    value={deliveryInput}
                    onChangeText={onDeliveryChange}
                    onBlur={onDeliveryBlur}
                    placeholder={t('settings.fees.placeholder')}
                />
            </View>
            <View style={styles.feeControl}>
                <ThemedText style={styles.feeLabel}>{t('settings.fees.toGo')}</ThemedText>
                <ThemedInput
                    style={styles.compactInput}
                    keyboardType="decimal-pad"
                    value={toGoInput}
                    onChangeText={onToGoChange}
                    onBlur={onToGoBlur}
                    placeholder={t('settings.fees.placeholder')}
                />
            </View>
            <View style={[styles.infoCallout, { backgroundColor: `${palette.tint}14`, borderColor: `${palette.tint}33` }]}>
                <Ionicons name="information-circle-outline" size={16} color={palette.tint} />
                <ThemedText style={styles.infoText}>{t('settings.fees.saveHint')}</ThemedText>
            </View>
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    feeControl: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'flex-start',
        gap: 8,
    },
    feeLabel: {
        fontSize: 13,
        opacity: 0.9,
    },
    compactInput: {
        width: 150,
        textAlign: 'right',
        alignSelf: 'flex-start',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    infoCallout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        maxWidth: 520,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        opacity: 0.95,
    },
});
