import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import type { PaymentMethodConfig } from '@/types/payment-methods';

type PaymentMethodChipSelectorProps = {
    methods: PaymentMethodConfig[];
    selectedId: string;
    onSelect: (id: string) => void;
};

export function PaymentMethodChipSelector({ methods, selectedId, onSelect }: PaymentMethodChipSelectorProps) {
    const palette = useAppColors();

    return (
        <View style={styles.chipRow}>
            {methods.map((method) => {
                const isSelected = selectedId === method.id;
                return (
                    <Pressable
                        key={method.id}
                        style={[
                            styles.chip,
                            { borderColor: palette.border },
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
    );
}

const styles = StyleSheet.create({
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
});
