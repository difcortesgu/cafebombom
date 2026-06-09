import { StyleSheet, View } from 'react-native';

import { ThemedChip } from '@/components/ui/themed-chip';

export type OperationsSection = 'tables' | 'payment-methods' | 'surcharges' | 'cash-register' | 'discounts' | 'receipt';
export type SettingsSection = 'printer' | 'connection' | 'backups' | 'diagnostics';

type SectionTabsProps<T extends string> = {
    section: T;
    labels: { key: T; label: string }[];
    onChange: (section: T) => void;
};

export function SectionTabs<T extends string>({ section, labels, onChange }: SectionTabsProps<T>) {
    return (
        <View style={styles.tabRow}>
            {labels.map((item) => (
                <ThemedChip
                    key={item.key}
                    style={styles.sectionButton}
                    label={item.label}
                    active={section === item.key}
                    onPress={() => onChange(item.key)}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sectionButton: {
        borderRadius: 10,
    },
});
