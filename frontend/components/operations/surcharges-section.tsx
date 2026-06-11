import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useIsWide } from '@/components/ui/centered-page';
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
    const isWide = useIsWide();
    const field = isWide ? styles.fieldHalf : styles.fieldFull;

    return (
        <ThemedCard style={[styles.card, isWide && styles.cardWide]}>
            <View style={styles.heading}>
                <Ionicons name="pricetags-outline" size={20} color={palette.tint} />
                <ThemedText type="subtitle">{t('settings.fees.title')}</ThemedText>
            </View>
            <ThemedText style={styles.muted}>{t('settings.fees.subtitle')}</ThemedText>

            <View style={styles.grid}>
                <View style={field}>
                    <View style={styles.fieldLabelRow}>
                        <Ionicons name="bicycle-outline" size={16} color={palette.icon} />
                        <ThemedText style={styles.fieldLabel}>{t('settings.fees.delivery')}</ThemedText>
                    </View>
                    <ThemedInput
                        numeric="currency"
                        value={deliveryInput}
                        onChangeText={onDeliveryChange}
                        onBlur={onDeliveryBlur}
                        placeholder={t('settings.fees.placeholder')}
                    />
                </View>
                <View style={field}>
                    <View style={styles.fieldLabelRow}>
                        <Ionicons name="bag-handle-outline" size={16} color={palette.icon} />
                        <ThemedText style={styles.fieldLabel}>{t('settings.fees.toGo')}</ThemedText>
                    </View>
                    <ThemedInput
                        numeric="currency"
                        value={toGoInput}
                        onChangeText={onToGoChange}
                        onBlur={onToGoBlur}
                        placeholder={t('settings.fees.placeholder')}
                    />
                </View>
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
    cardWide: {
        maxWidth: 760,
    },
    heading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    fieldFull: {
        width: '100%',
        gap: 6,
    },
    fieldHalf: {
        flexGrow: 1,
        flexBasis: '47%',
        gap: 6,
    },
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.85,
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
