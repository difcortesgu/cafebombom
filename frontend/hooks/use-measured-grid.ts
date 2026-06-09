import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

function getColumns(width: number): number {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
}

type MeasuredGridResult = {
    onLayout: (event: LayoutChangeEvent) => void;
    numCols: number;
    /** Per-card width, or undefined until the container has been measured. */
    cardWidth: number | undefined;
};

/**
 * Computes a responsive card width from the *measured* width of the grid
 * container (via onLayout) rather than the raw window width. This keeps cards
 * inside their real container regardless of surrounding padding/chrome.
 */
export function useMeasuredGrid(gap = 12): MeasuredGridResult {
    const [width, setWidth] = useState(0);

    const onLayout = (event: LayoutChangeEvent) => {
        const next = event.nativeEvent.layout.width;
        setWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    };

    const numCols = getColumns(width);
    const cardWidth = width > 0 ? (width - gap * (numCols - 1)) / numCols : undefined;

    return { onLayout, numCols, cardWidth };
}
