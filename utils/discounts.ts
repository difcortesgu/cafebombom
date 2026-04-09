import type { Discount, DiscountType, SaleItemInput } from '@/types/types';

type SaleItemDiscountBreakdown = {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  lineTotal: number;
  finalUnitPrice: number;
  discountSnapshot: {
    discountName: string | null;
    discountType: DiscountType | null;
    discountValue: number | null;
    discountAmount: number;
  };
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

export function calculateSaleDiscountBreakdown(
  items: SaleItemInput[],
  discounts: Discount[],
  nowUnix: number,
  globalDiscountId?: string | null,
): SaleDiscountBreakdown {
  const activeProductDiscounts = discounts
    .filter((discount) =>
      discount.isActive
      && discount.scope === 'product'
      && discount.startsAt <= nowUnix
      && (discount.endsAt == null || discount.endsAt >= nowUnix),
    )
    .slice();

  const activeGlobalDiscounts = discounts
    .filter((discount) =>
      discount.isActive
      && discount.scope === 'global',
    )
    .slice();

  const itemBreakdowns = items.map((item) => {
    const safeUnitPrice = roundMoney(toValidNumber(item.unitPrice));
    const safeQty = Math.max(0, Math.floor(toValidNumber(item.quantity)));
    const lineSubtotal = roundMoney(safeUnitPrice * safeQty);

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
      lineSubtotal,
      lineTotal,
      finalUnitPrice,
      discountSnapshot: {
        discountName: itemDiscount > 0 && selectedProductDiscount ? selectedProductDiscount.name : null,
        discountType: itemDiscount > 0 && selectedProductDiscount ? selectedProductDiscount.type : null,
        discountValue: itemDiscount > 0 && selectedProductDiscount ? selectedProductDiscount.value : null,
        discountAmount: itemDiscount,
      },
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
