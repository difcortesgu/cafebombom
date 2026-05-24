import { StyleSheet, View } from 'react-native';

import { ThemedChip } from '@/components/ui/themed-chip';

export type OperationsSection = 'tables' | 'payment-methods' | 'surcharges' | 'cash-register' | 'discounts' | 'receipt' | 'printer';

type SectionTabsProps = {
    section: OperationsSection;
    labels: { key: OperationsSection; label: string }[];
    onChange: (section: OperationsSection) => void;
};

export function SectionTabs({ section, labels, onChange }: SectionTabsProps) {
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
