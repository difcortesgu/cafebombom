import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type ChipItem = {
    value: string;
    label: string;
    icon?: string;
};

type ChipGroupProps = {
    items: ChipItem[];
    value: string;
    onValueChange: (value: string) => void;
    error?: string | null;
};

export function ChipGroup({ items, value, onValueChange, error }: ChipGroupProps) {
    const palette = useAppColors();

    return (
        <View style={styles.wrapper}>
            <View style={styles.chipRow}>
                {items.map((item) => {
                    const selected = item.value === value;
                    return (
                        <Pressable
                            key={item.value}
                            style={[
                                styles.chip,
                                { borderColor: error ? palette.danger : palette.border },
                                selected && { backgroundColor: palette.accent, borderColor: selected ? palette.accent : error ? palette.danger : palette.border },
                            ]}
                            onPress={() => onValueChange(item.value)}
                        >
                            {item.icon ? (
                                <Ionicons
                                    name={item.icon as any}
                                    size={18}
                                    color={selected ? palette.text : palette.mutedText}
                                />
                            ) : null}
                            <ThemedText style={[styles.chipLabel, selected && { color: palette.text }]}>
                                {item.label}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>
            {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: 4,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderRadius: 12,
    },
    chipLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    error: {
        fontSize: 12,
        marginLeft: 2,
    },
});
