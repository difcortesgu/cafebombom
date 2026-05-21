import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type FormFeedbackProps = {
    message?: string | null;
};

export function FormFeedback({ message }: FormFeedbackProps) {
    const palette = useAppColors();

    if (!message) {
        return null;
    }

    return (
        <View
            style={[
                styles.banner,
                { backgroundColor: palette.danger + '22', borderColor: palette.danger + '44' },
            ]}
        >
            <ThemedText style={[styles.message, { color: palette.danger }]}>{message}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    message: {
        fontSize: 13,
    },
});