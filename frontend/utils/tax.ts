import { roundMoney } from '@/utils/discounts';

export const COLOMBIAN_IVA_RATE = 0.08;

export type InclusiveTaxBreakdown = {
  taxAmount: number;
  preTaxAmount: number;
};

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
