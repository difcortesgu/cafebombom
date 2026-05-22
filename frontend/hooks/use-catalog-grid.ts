import { useWindowDimensions } from 'react-native';

const GRID_GAP = 12;
const PADDING = 16;

function getColumns(width: number): number {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
}

type CatalogGridResult = {
    screenWidth: number;
    numCols: number;
    cardWidth: number;
};

export function useCatalogGrid(): CatalogGridResult {
    const { width: screenWidth } = useWindowDimensions();
    const numCols = getColumns(screenWidth);
    const cardWidth = (screenWidth - PADDING * 2 - GRID_GAP * (numCols - 1)) / numCols;

    return { screenWidth, numCols, cardWidth };
}
