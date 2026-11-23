import type { PlanPrice } from '@quote/contract';

const priceFormat = {
  COP: new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  CLP: new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

export function displayPrice(price: PlanPrice) {
  const scale = price.currency === 'COP' ? 100 : 1;
  return priceFormat[price.currency].format(price.amountMinor / scale);
}
