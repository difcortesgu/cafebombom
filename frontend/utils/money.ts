import { useSettingsStore } from '@/stores/settings';
import { formatCurrency } from '@/utils/format/number';

/**
 * Format a monetary value using the user's current currency settings.
 *
 * Reads the settings store imperatively so it can be used anywhere (JSX,
 * template strings, pure utils) without wiring a hook. Currency config changes
 * rarely at runtime; screens re-render on their own data updates and will pick
 * up the new format then. For a reactive binding, use `useCurrency()` instead.
 */
export function money(value: unknown): string {
    return formatCurrency(Number(value), useSettingsStore.getState().currency);
}
