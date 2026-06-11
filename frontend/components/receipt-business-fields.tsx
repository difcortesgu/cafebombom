import { StyleSheet, View } from 'react-native';

import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';

export type ReceiptBusinessValues = {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessNit: string;
    /** Tax rate as a raw percent string (e.g. "8.00"). */
    taxRatePercent: string;
};

type ReceiptBusinessFieldsProps = {
    values: ReceiptBusinessValues;
    onChange: <K extends keyof ReceiptBusinessValues>(key: K, value: string) => void;
    /** Blur handler for the business text fields (used for commit-on-blur). */
    onBusinessBlur?: () => void;
    /** Blur handler for the tax field, if it commits separately. */
    onTaxBlur?: () => void;
    /** Two-column layout on wide screens; single column on phones. */
    isWide: boolean;
};

/**
 * Shared business-data fields for the receipt configuration form (business
 * name, address, phone, NIT and tax rate). Used both by the first-run setup
 * wizard and the ongoing Operations → Receipts section so the markup and
 * labels stay in one place; each screen keeps its own state and persistence.
 */
export function ReceiptBusinessFields({ values, onChange, onBusinessBlur, onTaxBlur, isWide }: ReceiptBusinessFieldsProps) {
    const half = isWide ? styles.fieldHalf : styles.fieldFull;

    return (
        <View style={styles.grid}>
            <View style={styles.fieldFull}>
                <ThemedInput
                    value={values.businessName}
                    label={t('settings.receipt.businessName')}
                    placeholder={t('settings.receipt.businessName')}
                    onChangeText={(value) => onChange('businessName', value)}
                    onBlur={onBusinessBlur}
                />
            </View>
            <View style={half}>
                <ThemedInput
                    value={values.businessAddress}
                    label={t('settings.receipt.businessAddress')}
                    placeholder={t('settings.receipt.businessAddress')}
                    onChangeText={(value) => onChange('businessAddress', value)}
                    onBlur={onBusinessBlur}
                />
            </View>
            <View style={half}>
                <ThemedInput
                    value={values.businessPhone}
                    label={t('settings.receipt.businessPhone')}
                    placeholder={t('settings.receipt.businessPhone')}
                    onChangeText={(value) => onChange('businessPhone', value)}
                    onBlur={onBusinessBlur}
                />
            </View>
            <View style={half}>
                <ThemedInput
                    value={values.businessNit}
                    label={t('settings.receipt.businessNit')}
                    placeholder={t('settings.receipt.businessNit')}
                    onChangeText={(value) => onChange('businessNit', value)}
                    onBlur={onBusinessBlur}
                />
            </View>
            <View style={half}>
                <ThemedInput
                    value={values.taxRatePercent}
                    numeric="percent"
                    label={t('settings.receipt.taxRate')}
                    placeholder="8.00"
                    onChangeText={(value) => onChange('taxRatePercent', value)}
                    onBlur={onTaxBlur}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    fieldFull: {
        width: '100%',
    },
    fieldHalf: {
        flexGrow: 1,
        flexBasis: '47%',
    },
});
