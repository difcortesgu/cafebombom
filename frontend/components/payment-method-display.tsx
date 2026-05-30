import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import type { PaymentMethodConfig } from '@/types/payment-methods';

type DisplayProps = {
    method?: PaymentMethodConfig | null;
    methodId?: string;
    methodName?: string;
    methodIcon?: string;
    size?: 'small' | 'medium' | 'large';
    showName?: boolean;
    showIcon?: boolean;
    style?: ViewStyle;
    containerStyle?: ViewStyle;
};

type BadgeProps = {
    method?: PaymentMethodConfig | null;
    methodId?: string;
    methodName?: string;
    methodIcon?: string;
    style?: ViewStyle;
    containerStyle?: ViewStyle;
};

type TextProps = {
    method?: PaymentMethodConfig | null;
    methodId?: string;
    methodName?: string;
    methodIcon?: string;
    style?: TextStyle;
};

/**
 * Displays a payment method with its icon and name.
 * Can receive either a full method object, or individual method details.
 */
export function PaymentMethodDisplay({
    method,
    methodId,
    methodName,
    methodIcon,
    size = 'medium',
    showName = true,
    showIcon = true,
    style,
    containerStyle,
}: DisplayProps) {
    const palette = useAppColors();
    const { methods } = usePaymentMethodsStore();

    // Resolve method from different input types
    let resolvedMethod = method;
    if (!resolvedMethod && methodId) {
        resolvedMethod = methods.find((m) => m.id === methodId);
    }

    let displayName = methodName || resolvedMethod?.name || methodId || '?';
    let displayIcon = methodIcon || resolvedMethod?.icon || 'wallet';

    const iconSizeMap = { small: 14, medium: 16, large: 20 };
    const iconSize = iconSizeMap[size];

    const textSizeMap = { small: 11, medium: 12, large: 13 };
    const textSize = textSizeMap[size];

    const containerGapMap = { small: 4, medium: 6, large: 8 };
    const containerGap = containerGapMap[size];

    return (
        <View style={[styles.container, { gap: containerGap }, containerStyle]}>
            {showIcon && (
                <Ionicons
                    name={displayIcon as any}
                    size={iconSize}
                    color={palette.tint}
                    style={[styles.icon, style]}
                />
            )}
            {showName && (
                <ThemedText style={[styles.text, { fontSize: textSize }]}>
                    {displayName}
                </ThemedText>
            )}
        </View>
    );
}

// Badge variant - for displaying payment method in a pill/badge style
export function PaymentMethodBadge({
    method,
    methodId,
    methodName,
    methodIcon,
    style,
    containerStyle,
}: BadgeProps) {
    const palette = useAppColors();
    const { methods } = usePaymentMethodsStore();

    // Resolve method from different input types
    let resolvedMethod = method;
    if (!resolvedMethod && methodId) {
        resolvedMethod = methods.find((m) => m.id === methodId);
    }

    let displayName = methodName || resolvedMethod?.name || methodId || '?';
    let displayIcon = methodIcon || resolvedMethod?.icon || 'wallet';

    return (
        <View style={[styles.badge, { backgroundColor: palette.tint }, containerStyle]}>
            <Ionicons
                name={displayIcon as any}
                size={12}
                color={palette.card}
            />
            <ThemedText style={[styles.badgeText, { color: palette.card }]}>
                {displayName}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        // Icon positioning handled by parent flexDirection
    },
    text: {
        fontWeight: '500',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
