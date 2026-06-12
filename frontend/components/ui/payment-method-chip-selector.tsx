import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import type { PaymentMethodConfig } from '@/types/payment-methods';

type PaymentMethodChipSelectorProps = {
    methods: PaymentMethodConfig[];
    selectedId: string;
    onSelect: (id: string) => void;
    error?: string | null;
};

export function PaymentMethodChipSelector({ methods, selectedId, onSelect, error }: PaymentMethodChipSelectorProps) {
    const palette = useAppColors();

    return (
        <View style={styles.wrapper}>
            <View style={styles.chipRow}>
                {methods.map((method) => {
                    const isSelected = selectedId === method.id;
                    return (
                        <Pressable
                            key={method.id}
                            style={[
                                styles.chip,
                                { borderColor: error ? palette.danger : palette.border },
                                isSelected && { backgroundColor: palette.accent, borderColor: palette.accent },
                            ]}
                            onPress={() => onSelect(method.id)}
                        >
                            <Ionicons
                                name={method.icon as keyof typeof Ionicons.glyphMap}
                                size={16}
                                color={isSelected ? palette.text : palette.mutedText}
                            />
                            <ThemedText
                                style={[
                                    styles.chipLabel,
                                    isSelected && { color: palette.text },
                                ]}
                            >
                                {method.name}
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
        gap: 8,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 8,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    error: {
        fontSize: 12,
        marginLeft: 2,
    },
});
