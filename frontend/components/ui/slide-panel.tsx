import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, type ReactNode } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type SlidePanelShellProps = {
    visible: boolean;
    onClose: () => void;
    onExited: () => void;
    children: ReactNode;
    width?: number;
    backdropStyle?: StyleProp<ViewStyle>;
    panelStyle?: StyleProp<ViewStyle>;
};

type SlidePanelProps = {
    visible: boolean;
    title: string;
    icon: string;
    onClose: () => void;
    onExited: () => void;
    children: ReactNode;
    footer?: ReactNode;
    width?: number;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

export function SlidePanelShell({
    visible,
    onClose,
    onExited,
    children,
    width,
    backdropStyle,
    panelStyle,
}: SlidePanelShellProps) {
    const palette = useAppColors();
    const { width: screenWidth } = useWindowDimensions();
    const panelWidth = width ?? Math.floor(screenWidth / 3);

    const slideAnim = useRef(new Animated.Value(panelWidth)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const prevVisibleRef = useRef(false);

    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = visible;

        if (visible && !wasVisible) {
            slideAnim.setValue(panelWidth);
            backdropOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 12,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (!visible && wasVisible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: panelWidth,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) onExited();
            });
        }
    }, [backdropOpacity, onExited, panelWidth, slideAnim, visible]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle, { opacity: backdropOpacity }]}
                pointerEvents="box-none"
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.panel,
                    {
                        width: panelWidth,
                        backgroundColor: palette.background,
                        borderLeftColor: palette.border,
                        transform: [{ translateX: slideAnim }],
                    },
                    panelStyle,
                ]}
            >
                {children}
            </Animated.View>
        </View>
    );
}

export function SlidePanel({
    visible,
    title,
    icon,
    onClose,
    onExited,
    children,
    footer,
    width,
    contentContainerStyle,
}: SlidePanelProps) {
    const palette = useAppColors();

    return (
        <SlidePanelShell visible={visible} onClose={onClose} onExited={onExited} width={width}>
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <View style={styles.headerTitle}>
                    <Ionicons name={icon as any} size={20} color={palette.tint} />
                    <ThemedText type="subtitle">{title}</ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={[styles.formContent, contentContainerStyle]} keyboardShouldPersistTaps="handled">
                {children}
            </ScrollView>

            {footer ? (
                <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                    {footer}
                </View>
            ) : null}
        </SlidePanelShell>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    panel: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        borderLeftWidth: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    closeButton: {
        padding: 4,
    },
    formContent: {
        padding: 16,
        gap: 16,
    },
    footer: {
        flexDirection: 'row',
        gap: 8,
        padding: 12,
        borderTopWidth: 1,
    },
});