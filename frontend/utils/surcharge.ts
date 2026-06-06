import { t } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';
import type { SalePricingSummary } from '@/types/sales';
import type { RestaurantTable } from '@/types/types';
import { formatCurrency } from '@/utils/format/number';

function money(value: number): string {
    return formatCurrency(value, useSettingsStore.getState().currency);
}

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
            toGoSurcharge > 0 ? `${t('sales.surcharge.toGo')}: +${money(toGoSurcharge)}` : '',
            deliverySurcharge > 0 ? `${t('sales.surcharge.delivery')}: +${money(deliverySurcharge)}` : '',
        ].filter(Boolean);
    }

    if (tableType === 'to-go') {
        return [`${t('sales.surcharge.toGo')}: +${money(totalSurcharge)}`];
    }

    return [`${t('sales.surcharge.generic')}: +${money(totalSurcharge)}`];
}
