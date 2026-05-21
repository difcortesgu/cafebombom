import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedButton } from '@/components/ui/themed-button';

type PanelActionRowProps = {
    primaryLabel: string;
    secondaryLabel: string;
    onPrimaryPress: () => void;
    onSecondaryPress: () => void;
    primaryIcon?: string;
    secondaryIcon?: string;
    primaryButtonStyle?: StyleProp<ViewStyle>;
};

export function PanelActionRow({
    primaryLabel,
    secondaryLabel,
    onPrimaryPress,
    onSecondaryPress,
    primaryIcon = 'checkmark-circle',
    secondaryIcon = 'arrow-back',
    primaryButtonStyle,
}: PanelActionRowProps) {
    return (
        <>
            <ThemedButton
                style={[styles.primaryButton, primaryButtonStyle]}
                icon={primaryIcon}
                label={primaryLabel}
                onPress={onPrimaryPress}
            />
            <ThemedButton
                variant="secondary"
                icon={secondaryIcon}
                label={secondaryLabel}
                onPress={onSecondaryPress}
            />
        </>
    );
}

const styles = StyleSheet.create({
    primaryButton: {
        flex: 1,
    },
});