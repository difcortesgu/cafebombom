import type { Discount, DiscountType, SaleItemAdditionalIngredientInput, SaleItemInput } from '../types/types';

export type SaleItemDiscountBreakdown = {
  productId: string;
  quantity: number;
  unitPrice: number;
  observation: string | null;
  removedIngredientIds: string[];
  additionalIngredients: SaleItemAdditionalIngredientInput[];
  lineSubtotal: number;
  lineTotal: number;
  finalUnitPrice: number;
  discountSnapshot: {
    discountName: string | null;
    discountType: DiscountType | null;
    discountValue: number | null;
    discountAmount: number;
  };
  // 1. NUEVO: Agregamos la propiedad al tipo de retorno
  comboItems?: SaleItemInput[];
};

export type SaleDiscountBreakdown = {
  subtotal: number;
  itemDiscountTotal: number;
  globalDiscountAmount: number;
  globalDiscountSnapshot: {
    discountName: string | null;
    discountType: DiscountType | null;
    discountValue: number | null;
  };
  total: number;
  items: SaleItemDiscountBreakdown[];
};

export type InclusiveTaxBreakdown = {
  taxAmount: number;
  preTaxAmount: number;
};

export const COLOMBIAN_IVA_RATE = 0.08;

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const toValidNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

const discountAmountFor = (base: number, type: DiscountType, value: number): number => {
  if (base <= 0) {
    return 0;
  }

  if (type === 'percentage') {
    return roundMoney((base * Math.max(0, value)) / 100);
  }

  return roundMoney(Math.max(0, value));
};

const clampDiscount = (base: number, amount: number): number => {
  return roundMoney(Math.min(Math.max(amount, 0), Math.max(base, 0)));
};

// A discount is "scheduled active" when it is enabled, within its date range, and
// the current local day-of-week / day-of-month / hour-of-day match its schedule.
// An empty array (or null hour range) on an axis means "no restriction".
export function isDiscountScheduledActive(discount: Discount, nowUnix: number): boolean {
  if (!discount.isActive) {
    return false;
  }
  if (discount.startsAt > nowUnix) {
    return false;
  }
  if (discount.endsAt != null && discount.endsAt < nowUnix) {
    return false;
  }
  const now = new Date(nowUnix * 1000);
  const daysOfWeek = discount.daysOfWeek ?? [];
  if (daysOfWeek.length > 0 && !daysOfWeek.includes(now.getDay())) {
    return false;
  }
  const daysOfMonth = discount.daysOfMonth ?? [];
  if (daysOfMonth.length > 0 && !daysOfMonth.includes(now.getDate())) {
    return false;
  }
  if (discount.hourStart != null && discount.hourEnd != null) {
    const hour = now.getHours();
    if (hour < discount.hourStart || hour >= discount.hourEnd) {
      return false;
    }
  }
  return true;
}

export function calculateSaleDiscountBreakdown(
  items: SaleItemInput[],
  discounts: Discount[],
  nowUnix: number,
  globalDiscountId?: string | null,
): SaleDiscountBreakdown {
  const activeProductDiscounts = discounts
    .filter((discount) => discount.scope === 'product' && isDiscountScheduledActive(discount, nowUnix))
    .slice();

  const activeGlobalDiscounts = discounts
    .filter((discount) => discount.scope === 'global' && isDiscountScheduledActive(discount, nowUnix))
    .slice();

  const itemBreakdowns = items.map((item) => {
    const safeUnitPrice = roundMoney(toValidNumber(item.unitPrice));
    const safeQty = Math.max(0, Math.floor(toValidNumber(item.quantity)));
    const observation = typeof item.observation === 'string' ? item.observation.trim() : '';
    const removedIngredientIds = Array.isArray(item.removedIngredientIds)
      ? Array.from(new Set(item.removedIngredientIds.filter((value): value is string => typeof value === 'string' && value.length > 0)))
      : [];
    const additionalIngredients = Array.isArray(item.additionalIngredients)
      ? item.additionalIngredients
        .map((entry) => ({ ingredientId: String(entry.ingredientId ?? '').trim(), quantity: Math.max(0, Math.floor(Number(entry.quantity ?? 0))) }))
        .filter((entry) => entry.ingredientId.length > 0 && entry.quantity > 0)
      : [];
    const lineSubtotal = roundMoney(safeUnitPrice * safeQty);

    // Discounts are matched against the line's own productId only. For a combo this
    // is the combo product's id, so a discount defined on the combo applies while the
    // discounts of the products chosen inside the combo never do (they are not lines) —
    // even when the combo itself has no discount.
    const selectedProductDiscount = activeProductDiscounts
      .filter((discount) => discount.productId === item.productId)
      .sort((left, right) => right.value - left.value)[0];

    const itemDiscount = selectedProductDiscount
      ? clampDiscount(lineSubtotal, discountAmountFor(lineSubtotal, selectedProductDiscount.type, selectedProductDiscount.value))
      : 0;

    const lineTotal = roundMoney(Math.max(0, lineSubtotal - itemDiscount));
    const finalUnitPrice = safeQty > 0 ? roundMoney(lineTotal / safeQty) : 0;

    return {
      productId: item.productId,
      quantity: safeQty,
      unitPrice: safeUnitPrice,
      observation: observation.length > 0 ? observation : null,
      removedIngredientIds,
      additionalIngredients,
      lineSubtotal,
      lineTotal,
      finalUnitPrice,
      discountSnapshot: {
        discountName: itemDiscount > 0 && selectedProductDiscount ? selectedProductDiscount.name : null,
        discountType: itemDiscount > 0 && selectedProductDiscount ? selectedProductDiscount.type : null,
        discountValue: itemDiscount > 0 && selectedProductDiscount ? selectedProductDiscount.value : null,
        discountAmount: itemDiscount,
      },
      // 2. NUEVO: Transferimos los comboItems del input original al objeto ya procesado
      comboItems: item.comboItems,
    };
  });

  const subtotal = roundMoney(itemBreakdowns.reduce((sum, item) => sum + item.lineSubtotal, 0));
  const itemDiscountTotal = roundMoney(itemBreakdowns.reduce((sum, item) => sum + item.discountSnapshot.discountAmount, 0));
  const postItemDiscount = roundMoney(Math.max(0, subtotal - itemDiscountTotal));

  const selectedGlobalDiscount = globalDiscountId
    ? activeGlobalDiscounts.find((discount) => discount.id === globalDiscountId)
    : undefined;

  const globalDiscountAmount = selectedGlobalDiscount
    ? clampDiscount(postItemDiscount, discountAmountFor(postItemDiscount, selectedGlobalDiscount.type, selectedGlobalDiscount.value))
    : 0;
  const total = roundMoney(Math.max(0, postItemDiscount - globalDiscountAmount));

  return {
    subtotal,
    itemDiscountTotal,
    globalDiscountAmount,
    globalDiscountSnapshot: {
      discountName: globalDiscountAmount > 0 && selectedGlobalDiscount ? selectedGlobalDiscount.name : null,
      discountType: globalDiscountAmount > 0 && selectedGlobalDiscount ? selectedGlobalDiscount.type : null,
      discountValue: globalDiscountAmount > 0 && selectedGlobalDiscount ? selectedGlobalDiscount.value : null,
    },
    total,
    items: itemBreakdowns,
  };
}

export function calculateInclusiveTax(total: number, rate: number): InclusiveTaxBreakdown {
  const normalizedTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const normalizedRate = Number.isFinite(rate) ? Math.max(0, rate) : 0;

  if (normalizedRate === 0) {
    return {
      taxAmount: 0,
      preTaxAmount: roundMoney(normalizedTotal),
    };
  }

  const preTaxAmount = roundMoney(normalizedTotal / (1 + normalizedRate));
  const taxAmount = roundMoney(normalizedTotal - preTaxAmount);

  return {
    taxAmount,
    preTaxAmount,
  };
}