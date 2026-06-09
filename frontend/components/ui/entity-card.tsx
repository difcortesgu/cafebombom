import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';

/** Below this width, actions flagged `collapseOnNarrow` (e.g. delete) render icon-only. */
const COMPACT_BREAKPOINT = 768;

export type CardAction = {
    key?: string;
    icon: string;
    label: string;
    onPress: () => void;
    tone?: 'danger' | 'warning' | 'success';
    variant?: 'primary' | 'secondary';
    /** Render icon-only (no text) on narrow screens. Used for delete buttons. */
    collapseOnNarrow?: boolean;
    style?: StyleProp<ViewStyle>;
};

type EntityCardProps = {
    /** Measured per-card width from `useMeasuredGrid`; undefined until measured. */
    width?: number;
    title: string;
    titleNumberOfLines?: number;
    /** Rendered before the title (e.g. a leading icon). */
    titleLeading?: ReactNode;
    /** Rendered after the title (e.g. a status/combo icon). */
    titleTrailing?: ReactNode;
    /** Right-aligned info column (price, quantity, tags, status, etc.). */
    info?: ReactNode;
    /** Full-width media above the title row (e.g. an image). */
    media?: ReactNode;
    /** Content between the title row and the actions row (progress bars, meta rows…). */
    children?: ReactNode;
    actions?: CardAction[];
    style?: StyleProp<ViewStyle>;
};

export function EntityCard({
    width,
    title,
    titleNumberOfLines = 2,
    titleLeading,
    titleTrailing,
    info,
    media,
    children,
    actions,
    style,
}: EntityCardProps) {
    const narrow = useWindowDimensions().width < COMPACT_BREAKPOINT;

    return (
        <View style={[styles.card, { width }, style]}>
            {media}
            <View style={styles.topRow}>
                <View style={styles.titleArea}>
                    {titleLeading}
                    <ThemedText style={styles.title} numberOfLines={titleNumberOfLines}>
                        {title}
                    </ThemedText>
                    {titleTrailing}
                </View>
                {info ? <View style={styles.infoCol}>{info}</View> : null}
            </View>
            {children}
            {actions && actions.length > 0 ? (
                <View style={styles.actionsRow}>
                    {actions.map((action, index) => {
                        const collapsed = action.collapseOnNarrow && narrow;
                        return (
                            <ThemedButton
                                key={action.key ?? action.label ?? index}
                                icon={action.icon}
                                label={collapsed ? undefined : action.label}
                                accessibilityLabel={action.label}
                                tone={action.tone}
                                variant={action.variant ?? 'secondary'}
                                size="sm"
                                style={[collapsed ? undefined : styles.actionBtn, action.style]}
                                onPress={action.onPress}
                            />
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    titleArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    title: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    infoCol: {
        flexShrink: 0,
        alignItems: 'flex-end',
        gap: 4,
        maxWidth: '55%',
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: 2,
    },
    actionBtn: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 84,
    },
});
