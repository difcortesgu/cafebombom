import { t } from '@/i18n';
import type { SalePricingSummary } from '@/types/sales';
import type { RestaurantTable } from '@/types/types';

type SurchargeBreakdownEntry = {
    label: string;
    description?: string | null;
    amount: number;
};

/**
 * Returns a structured breakdown of surcharge amounts for display and receipt generation.
 */
export function getReceiptSurchargeBreakdown(
    pricing: SalePricingSummary,
    tableName: string,
    tables: RestaurantTable[],
    configuredToGoSurcharge: number,
): SurchargeBreakdownEntry[] {
    const totalSurcharge = Math.max(0, Number(pricing.order_type_surcharge));
    if (totalSurcharge <= 0) {
        return [];
    }

    const tableType = tables.find((table) => table.name === tableName)?.table_type;

    if (tableType === 'delivery') {
        const toGoAmount = Math.min(Math.max(0, configuredToGoSurcharge), totalSurcharge);
        const deliveryAmount = Math.max(0, totalSurcharge - toGoAmount);

        return [
            toGoAmount > 0
                ? { label: t('sales.surcharge.toGo'), description: t('tables.type.toGo'), amount: toGoAmount }
                : null,
            deliveryAmount > 0
                ? { label: t('sales.surcharge.delivery'), description: t('tables.type.delivery'), amount: deliveryAmount }
                : null,
        ].filter(Boolean) as SurchargeBreakdownEntry[];
    }

    if (tableType === 'to-go') {
        return [{ label: t('sales.surcharge.toGo'), description: t('tables.type.toGo'), amount: totalSurcharge }];
    }

    return [{ label: t('sales.surcharge.generic'), description: t('tables.type.dineIn'), amount: totalSurcharge }];
}

/**
 * Returns formatted surcharge lines for in-panel display (e.g. "Recargo para llevar: +$5.00").
 */
export function getSaleSurchargeLines(
    pricing: SalePricingSummary,
    tableName: string,
    tables: RestaurantTable[],
    configuredToGoSurcharge: number,
): string[] {
    const totalSurcharge = Math.max(0, Number(pricing.order_type_surcharge));
    if (totalSurcharge <= 0) {
        return [];
    }

    const tableType = tables.find((table) => table.name === tableName)?.table_type;

    if (tableType === 'delivery') {
        const toGoSurcharge = Math.min(Math.max(0, configuredToGoSurcharge), totalSurcharge);
        const deliverySurcharge = Math.max(0, totalSurcharge - toGoSurcharge);

        return [
            toGoSurcharge > 0 ? `${t('sales.surcharge.toGo')}: +$${toGoSurcharge.toFixed(2)}` : '',
            deliverySurcharge > 0 ? `${t('sales.surcharge.delivery')}: +$${deliverySurcharge.toFixed(2)}` : '',
        ].filter(Boolean);
    }

    if (tableType === 'to-go') {
        return [`${t('sales.surcharge.toGo')}: +$${totalSurcharge.toFixed(2)}`];
    }

    return [`${t('sales.surcharge.generic')}: +$${totalSurcharge.toFixed(2)}`];
}
