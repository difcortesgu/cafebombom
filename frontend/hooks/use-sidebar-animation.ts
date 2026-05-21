import { useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';

const COLLAPSED_WIDTH = 68;
const EXPANDED_WIDTH = 236;

export function useSidebarAnimation({ isMobileLayout }: { isMobileLayout: boolean }) {
    const canHoverSidebar = Platform.OS === 'web' && !isMobileLayout;
    const [expanded, setExpanded] = useState(!canHoverSidebar);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const sidebarWidth = useRef(new Animated.Value(canHoverSidebar ? COLLAPSED_WIDTH : EXPANDED_WIDTH)).current;
    const drawerProgress = useRef(new Animated.Value(0)).current;
    const labelReveal = useRef(new Animated.Value(canHoverSidebar ? 0 : 1)).current;

    useEffect(() => {
        setExpanded(!canHoverSidebar);
    }, [canHoverSidebar]);

    useEffect(() => {
        Animated.timing(sidebarWidth, {
            toValue: canHoverSidebar ? (expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH) : EXPANDED_WIDTH,
            duration: 180,
            useNativeDriver: false,
        }).start();
    }, [canHoverSidebar, expanded, sidebarWidth]);

    useEffect(() => {
        Animated.timing(labelReveal, {
            toValue: canHoverSidebar ? (expanded ? 1 : 0) : 1,
            duration: 170,
            useNativeDriver: false,
        }).start();
    }, [canHoverSidebar, expanded, labelReveal]);

    useEffect(() => {
        if (!isMobileLayout && drawerOpen) {
            setDrawerOpen(false);
        }
    }, [drawerOpen, isMobileLayout]);

    useEffect(() => {
        Animated.timing(drawerProgress, {
            toValue: drawerOpen ? 1 : 0,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [drawerOpen, drawerProgress]);

    return { expanded, setExpanded, drawerOpen, setDrawerOpen, sidebarWidth, drawerProgress, labelReveal, canHoverSidebar };
}
