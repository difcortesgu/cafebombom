import { t } from '@/i18n';
import type { TableType } from '@/types/types';

export function getTableSurcharge(tableType: TableType, toGoSurcharge: number, deliverySurcharge: number) {
    const safeToGo = Math.max(0, toGoSurcharge);
    const safeDelivery = Math.max(0, deliverySurcharge);
    const delivery = tableType === 'delivery' ? safeDelivery : 0;
    const toGo = tableType === 'to-go' || tableType === 'delivery' ? safeToGo : 0;
    return { toGo, delivery, total: toGo + delivery };
}

export function formatSaleStatusLabel(status: string) {
    if (status === 'draft') return t('sales.status.draft');
    if (status === 'in-progress') return t('sales.status.inProgress');
    if (status === 'ready') return t('sales.status.ready');
    if (status === 'completed') return t('sales.status.completed');
    if (status === 'cancelled') return t('sales.status.cancelled');
    return status;
}
