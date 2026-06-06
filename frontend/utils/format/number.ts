/**
 * Numeric input sanitization and currency/number formatting.
 *
 * Form inputs across the app keep their value as a *raw* numeric string
 * (e.g. a price field holds "1234.5", not "$1,234.50"). These helpers let the
 * UI display a friendly formatted value while the stored value stays raw, and
 * reject characters that don't belong in a numeric field as the user types.
 */

export type NumericMode = 'integer' | 'decimal' | 'currency' | 'percent';

export type CurrencyConfig = {
    symbol: string;
    decimals: number;
    thousandsSep: string;
    decimalSep: string;
    symbolPosition: 'prefix' | 'suffix';
};

export const DEFAULT_CURRENCY: CurrencyConfig = {
    symbol: '$',
    decimals: 2,
    thousandsSep: ',',
    decimalSep: '.',
    symbolPosition: 'prefix',
};

/** Max fractional digits allowed while typing for each mode. */
const MAX_DECIMALS: Record<NumericMode, number> = {
    integer: 0,
    decimal: 4,
    currency: 2,
    percent: 2,
};

/**
 * Strip every character that isn't valid for `mode` and normalize the result to
 * a canonical raw numeric string using "." as the decimal separator.
 *
 * - integer: digits only.
 * - decimal/currency/percent: digits plus a single "." with a bounded number of
 *   fractional digits.
 *
 * Always returns a value safe to store in form state and to `Number(...)`.
 */
export function sanitizeNumeric(text: string, mode: NumericMode): string {
    if (!text) return '';

    // Preserve a single leading minus sign (refunds / cash adjustments).
    const negative = /^\s*-/.test(text);
    const sign = negative ? '-' : '';

    // Drop everything except digits and dots (treat any "," as a decimal point so
    // locale keyboards that emit a comma still work).
    const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');

    if (mode === 'integer') {
        const digits = cleaned.replace(/\./g, '');
        return digits ? sign + digits : '';
    }

    // Keep only the first dot; merge the rest into the fractional part.
    const firstDot = cleaned.indexOf('.');
    let result: string;
    if (firstDot === -1) {
        result = cleaned;
    } else {
        const intPart = cleaned.slice(0, firstDot);
        const fracPart = cleaned.slice(firstDot + 1).replace(/\./g, '');
        result = `${intPart}.${fracPart}`;
    }

    // Clamp fractional digits.
    const max = MAX_DECIMALS[mode];
    const dot = result.indexOf('.');
    if (dot !== -1 && result.length - dot - 1 > max) {
        result = result.slice(0, dot + 1 + max);
    }
    return result ? sign + result : '';
}

/** Group the integer part with the configured thousands separator. */
function groupThousands(intDigits: string, sep: string): string {
    return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Format a raw numeric string for live display inside a currency input, e.g.
 * "1234.5" -> "$1,234.50". Decimals are only padded once the user has typed a
 * decimal separator, so typing the integer part still feels natural.
 */
export function formatCurrencyDisplay(raw: string, config: CurrencyConfig = DEFAULT_CURRENCY): string {
    if (!raw || raw === '-') return raw;

    const negative = raw.startsWith('-');
    const sign = negative ? '-' : '';
    const unsigned = negative ? raw.slice(1) : raw;

    const hasDot = unsigned.includes('.');
    const [intPartRaw, fracPartRaw = ''] = unsigned.split('.');
    const intDigits = (intPartRaw || '0').replace(/^0+(?=\d)/, '');
    const grouped = groupThousands(intDigits, config.thousandsSep);

    let body = grouped;
    if (hasDot) {
        // Keep what the user typed (capped); pad to full precision only when full.
        const frac = fracPartRaw.slice(0, config.decimals);
        body = `${grouped}${config.decimalSep}${frac}`;
    }

    return config.symbolPosition === 'prefix'
        ? `${sign}${config.symbol}${body}`
        : `${sign}${body}${config.symbol}`;
}

/** Format a finished numeric value for read-only display (lists, dashboard…). */
export function formatCurrency(value: number, config: CurrencyConfig = DEFAULT_CURRENCY): string {
    const n = Number.isFinite(value) ? value : 0;
    const fixed = Math.abs(n).toFixed(config.decimals);
    const [intPart, fracPart] = fixed.split('.');
    const grouped = groupThousands(intPart, config.thousandsSep);
    const body = fracPart ? `${grouped}${config.decimalSep}${fracPart}` : grouped;
    const sign = n < 0 ? '-' : '';
    return config.symbolPosition === 'prefix'
        ? `${sign}${config.symbol}${body}`
        : `${sign}${body}${config.symbol}`;
}

/** Format a raw numeric string for live display inside a percent input. */
export function formatPercentDisplay(raw: string): string {
    if (!raw) return '';
    return `${raw}%`;
}

/**
 * Format a raw numeric string for display according to `mode`. Plain numeric
 * modes (integer/decimal) are shown as-is; currency/percent get decoration.
 */
export function formatNumericDisplay(
    raw: string,
    mode: NumericMode,
    config: CurrencyConfig = DEFAULT_CURRENCY,
): string {
    switch (mode) {
        case 'currency':
            return formatCurrencyDisplay(raw, config);
        case 'percent':
            return formatPercentDisplay(raw);
        default:
            return raw;
    }
}
