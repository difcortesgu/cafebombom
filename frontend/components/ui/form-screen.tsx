import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

type FormScreenProps = ScrollViewProps & {
    contentStyle?: StyleProp<ViewStyle>;
};

export function FormScreen({ children, contentContainerStyle, contentStyle, ...props }: FormScreenProps) {
    return (
        <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]} {...props}>
            <View style={[styles.content, contentStyle]}>{children}</View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 16,
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 680,
        gap: 12,
    },
});