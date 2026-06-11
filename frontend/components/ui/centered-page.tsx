import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

/** Breakpoint shared with `useResponsiveOpen` — screens at or above this are "wide". */
export const WIDE_BREAKPOINT = 768;

export function useIsWide(): boolean {
    const { width } = useWindowDimensions();
    return width >= WIDE_BREAKPOINT;
}

type CenteredPageProps = {
    children: ReactNode;
    /** Maximum content width on wide screens. */
    maxWidth?: number;
    style?: StyleProp<ViewStyle>;
};

/**
 * Constrains content to a max width and centers it on wide screens (web/tablet)
 * while staying full-width on phones, so forms don't stretch edge-to-edge.
 */
export function CenteredPage({ children, maxWidth = 880, style }: CenteredPageProps) {
    const isWide = useIsWide();
    return (
        <View style={[styles.full, isWide && { maxWidth, alignSelf: 'center' }, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    full: {
        width: '100%',
    },
});
