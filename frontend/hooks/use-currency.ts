import { useCallback } from 'react';

import { useSettingsStore } from '@/stores/settings';
import { formatCurrency } from '@/utils/format/number';

/**
 * Returns a `money(value)` formatter bound to the user's currency settings.
 * Use everywhere a monetary amount is shown so symbol/decimals/separators stay
 * consistent app-wide (replaces ad-hoc `` `$${x.toFixed(2)}` `` strings).
 */
export function useCurrency() {
    const currency = useSettingsStore((s) => s.currency);
    const money = useCallback(
        (value: unknown) => formatCurrency(Number(value), currency),
        [currency],
    );
    return { money, currency };
}
