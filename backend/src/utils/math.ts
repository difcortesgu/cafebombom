/**
 * Rounds a monetary value to 2 decimal places.
 */
export function roundMoney(value: number): number {
    return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/**
 * Clamps a quantity to a non-negative integer.
 */
export function clampQuantity(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.floor(value));
}

/**
 * Normalizes a free-text observation field: trims whitespace, returns null if empty.
 */
export function normalizeObservation(raw: unknown): string | null {
    if (typeof raw !== 'string') {
        return null;
    }
    const value = raw.trim();
    return value.length > 0 ? value : null;
}

/**
 * Distributes `total` proportionally across `weights`, ensuring the sum of
 * allocated values equals `total` (last bucket absorbs rounding remainder).
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
    const safeTotal = roundMoney(total);
    if (safeTotal <= 0 || weights.length === 0) {
        return weights.map(() => 0);
    }

    const safeWeights = weights.map((weight) => Math.max(0, Number(weight) || 0));
    const weightSum = safeWeights.reduce((sum, value) => sum + value, 0);
    if (weightSum <= 0) {
        const evenShare = roundMoney(safeTotal / safeWeights.length);
        const result = safeWeights.map(() => evenShare);
        const currentSum = roundMoney(result.reduce((sum, value) => sum + value, 0));
        result[result.length - 1] = roundMoney(result[result.length - 1] + (safeTotal - currentSum));
        return result;
    }

    const provisional = safeWeights.map((weight) => roundMoney((safeTotal * weight) / weightSum));
    const provisionalSum = roundMoney(provisional.reduce((sum, value) => sum + value, 0));
    provisional[provisional.length - 1] = roundMoney(provisional[provisional.length - 1] + (safeTotal - provisionalSum));
    return provisional;
}
