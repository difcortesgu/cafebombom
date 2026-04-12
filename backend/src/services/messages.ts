type SalesErrorKey =
  | 'tableHasLinkedSales'
  | 'orderNotFound'
  | 'onlyDraftEditable'
  | 'sendToKitchenInvalidStatus'
  | 'markReadyInvalidStatus'
  | 'markPaidInvalidStatus'
  | 'addItemsDraftOnly'
  | 'productNotFound'
  | 'removeItemsDraftOnly'
  | 'cancelInvalidStatus';

type MessageParams = Record<string, string | number | null | undefined>;

export function salesErrorMessage(key: SalesErrorKey, params: MessageParams = {}): string {
  switch (key) {
    case 'tableHasLinkedSales':
      return 'No se puede eliminar la mesa porque tiene ventas asociadas.';
    case 'orderNotFound':
      return `No se encontro la orden ${String(params.orderId ?? '')}.`.trim();
    case 'onlyDraftEditable':
      return 'Solo las ordenes en borrador se pueden editar.';
    case 'sendToKitchenInvalidStatus':
      return `No se puede enviar a cocina una orden con estado ${String(params.status ?? '')}.`;
    case 'markReadyInvalidStatus':
      return `Solo se pueden marcar como listas las ordenes en progreso. Estado actual: ${String(params.status ?? '')}.`;
    case 'markPaidInvalidStatus':
      return `No se puede registrar pago para una orden con estado ${String(params.status ?? '')}.`;
    case 'addItemsDraftOnly':
      return `Solo se pueden agregar items a ordenes en borrador. Estado actual: ${String(params.status ?? '')}.`;
    case 'productNotFound':
      return `No se encontro el producto ${String(params.productId ?? '')}.`;
    case 'removeItemsDraftOnly':
      return `Solo se pueden quitar items de ordenes en borrador. Estado actual: ${String(params.status ?? '')}.`;
    case 'cancelInvalidStatus':
      return `No se puede cancelar una orden con estado ${String(params.status ?? '')}.`;
    default:
      return 'Ha ocurrido un error en ventas.';
  }
}

export function paymentMethodLabel(method: string | null): string {
  if (!method) {
    return '';
  }
  if (method === 'card') {
    return 'Tarjeta';
  }
  if (method === 'transfer') {
    return 'Transferencia';
  }
  return 'Efectivo';
}

export const receiptLabels = {
  phonePrefix: 'Telefono',
  order: 'Orden',
  date: 'Fecha',
  staff: 'Atiende',
  table: 'Mesa',
  payment: 'Pago',
  subtotal: 'Subtotal',
  itemDiscount: 'Descuentos items',
  globalDiscount: 'Descuento global',
  preTaxTotal: 'Total antes de IVA',
  total: 'Total',
  qr: 'QR',
  discount: 'Descuento',
  surchargeGeneric: 'Recargo',
} as const;

export function namedDiscountLabel(name: string): string {
  return `Descuento (${name})`;
}

export function taxInclusiveLabel(label: string, ratePercent: string): string {
  return `${label} incluido (${ratePercent}%)`;
}
